import { prisma } from '../database/prisma';
import { LeadStage } from '@prisma/client';

export async function getOrCreateConversation(userId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { userId, status: 'active' },
    orderBy: { updatedAt: 'desc' },
    include: { lead: true }
  });

  if (existing) {
    return existing;
  }

  return prisma.conversation.create({
    data: {
      userId,
      status: 'active',
      leadStage: LeadStage.NONE
    },
    include: { lead: true }
  });
}

export async function updateConversationStage(conversationId: string, stage: LeadStage, leadId?: string | null) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      leadStage: stage,
      leadId: leadId ?? null
    },
    include: { lead: true }
  });
}
