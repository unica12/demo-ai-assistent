import { Telegraf } from 'telegraf';
import { env } from '../config/env';

export function createNotificationService(bot: Telegraf) {
  return {
    async hotLead(message: string) {
      await bot.telegram.sendMessage(env.MANAGER_CHAT_ID, `🔥 Hot lead detected\n\n${message}`);
    },
    async leadCaptured(message: string) {
      await bot.telegram.sendMessage(env.MANAGER_CHAT_ID, `✅ Lead captured\n\n${message}`);
    }
  };
}
