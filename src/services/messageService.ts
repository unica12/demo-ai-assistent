import { prisma } from '../database/prisma';
import { ChatMessage } from '../types/ai';

const MAX_CONTEXT_MESSAGES = 12;

export async function saveMessage(conversationId: string, role: string, content: string) {
  return prisma.message.create({
    data: {
      conversationId,
      role,
      content
    }
  });
}

export async function getRecentMessages(conversationId: string): Promise<ChatMessage[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: MAX_CONTEXT_MESSAGES
  });

  return messages
    .reverse()
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    }));
}
