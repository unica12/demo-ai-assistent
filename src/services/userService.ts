import { prisma } from '../database/prisma';

export async function upsertUser(params: {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}) {
  const { telegramId, username, firstName, lastName } = params;

  return prisma.user.upsert({
    where: { telegramId },
    update: { username, firstName, lastName },
    create: { telegramId, username, firstName, lastName }
  });
}
