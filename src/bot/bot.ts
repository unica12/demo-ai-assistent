import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { errorHandler } from '../middlewares/errorHandler';
import { rateLimitMiddleware } from '../middlewares/rateLimit';
import { upsertUser } from '../services/userService';
import { getOrCreateConversation } from '../services/conversationService';
import { getRecentMessages, saveMessage } from '../services/messageService';
import { generateAssistantReply } from '../ai/aiService';
import { createNotificationService } from '../services/notificationService';
import { LeadStage } from '@prisma/client';
import { handleLeadStage, startLeadCollection } from '../leads/leadService';
import { logger } from '../utils/logger';

export function createBot() {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
  const notifications = createNotificationService(bot);

  bot.use(errorHandler());
  bot.use(rateLimitMiddleware());

  bot.start(async (ctx) => {
    await ctx.reply('Hi! I am here to help. Tell me what you are looking for.');
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const from = ctx.from;

    if (!from) {
      return;
    }

    const user = await upsertUser({
      telegramId: String(from.id),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name
    });

    const conversation = await getOrCreateConversation(user.id);

    if (conversation.leadStage !== LeadStage.NONE && conversation.leadId) {
      const leadResponse = await handleLeadStage({
        conversationId: conversation.id,
        leadId: conversation.leadId,
        stage: conversation.leadStage,
        message: text
      });

      await ctx.reply(leadResponse.reply);
      await saveMessage(conversation.id, 'user', text);
      await saveMessage(conversation.id, 'assistant', leadResponse.reply);

      if (leadResponse.completed && conversation.leadId) {
        await notifications.leadCaptured(
          `User: ${from.first_name ?? ''} ${from.last_name ?? ''} (@${from.username ?? 'n/a'})\nLead ID: ${conversation.leadId}`
        );
      }

      return;
    }

    await saveMessage(conversation.id, 'user', text);

    const contextMessages = await getRecentMessages(conversation.id);
    const aiResponse = await generateAssistantReply(contextMessages);

    await ctx.reply(aiResponse.reply);
    await saveMessage(conversation.id, 'assistant', aiResponse.reply);

    if (aiResponse.should_collect_contact && aiResponse.intent === 'hot') {
      const { lead } = await startLeadCollection({
        conversationId: conversation.id,
        userId: user.id,
        intent: aiResponse.intent
      });

      const contactMessage = aiResponse.contact_request_message || 'Could you share your name so we can help you faster?';
      await ctx.reply(contactMessage);
      await saveMessage(conversation.id, 'assistant', contactMessage);

      await notifications.hotLead(
        `User: ${from.first_name ?? ''} ${from.last_name ?? ''} (@${from.username ?? 'n/a'})\nLead ID: ${lead.id}\nMessage: ${text}`
      );
    }
  });

  bot.catch((error) => {
    logger.error({ error }, 'Bot error');
  });

  return bot;
}
