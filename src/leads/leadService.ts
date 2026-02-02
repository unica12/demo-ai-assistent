import { LeadStage, LeadStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../database/prisma';
import { updateConversationStage } from '../services/conversationService';

const phoneSchema = z
  .string()
  .min(6)
  .max(20)
  .regex(/^[+\d][\d\s()-]+$/, 'Invalid phone number');

export async function startLeadCollection(params: {
  conversationId: string;
  userId: string;
  intent: string;
}) {
  const lead = await prisma.lead.create({
    data: {
      userId: params.userId,
      intent: params.intent,
      status: LeadStatus.COLLECTING
    }
  });

  const conversation = await updateConversationStage(params.conversationId, LeadStage.ASK_NAME, lead.id);

  return { conversation, lead };
}

export async function handleLeadStage(params: {
  conversationId: string;
  leadId: string;
  stage: LeadStage;
  message: string;
}) {
  const { conversationId, leadId, stage, message } = params;

  if (stage === LeadStage.ASK_NAME) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { name: message.trim() }
    });
    const conversation = await updateConversationStage(conversationId, LeadStage.ASK_PHONE, leadId);
    return { reply: 'Thanks! What phone number should we use to reach you?', conversation };
  }

  if (stage === LeadStage.ASK_PHONE) {
    const parsed = phoneSchema.safeParse(message.trim());
    if (!parsed.success) {
      return { reply: 'Could you share a valid phone number (include country code if possible)?' };
    }
    await prisma.lead.update({
      where: { id: leadId },
      data: { phone: parsed.data }
    });
    const conversation = await updateConversationStage(conversationId, LeadStage.ASK_SERVICE, leadId);
    return { reply: 'Great. What service are you interested in?', conversation };
  }

  if (stage === LeadStage.ASK_SERVICE) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { service: message.trim(), status: LeadStatus.QUALIFIED }
    });
    const conversation = await updateConversationStage(conversationId, LeadStage.NONE, null);
    return { reply: 'Perfect. Our team will reach out shortly. Thank you!', conversation, completed: true };
  }

  return { reply: 'Thanks! How can I assist you today?' };
}
