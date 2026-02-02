import { createBot } from './bot/bot';
import { connectDatabase } from './database/prisma';
import { redis } from './database/redis';
import { logger } from './utils/logger';

async function bootstrap() {
  await connectDatabase();
  await redis.ping();

  const bot = createBot();
  await bot.launch();
  logger.info('Telegram bot started');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Failed to start application');
  process.exit(1);
});
