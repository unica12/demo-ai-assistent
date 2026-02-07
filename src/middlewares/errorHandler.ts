import { MiddlewareFn, Context } from 'telegraf';
import { logger } from '../utils/logger';

export function errorHandler(): MiddlewareFn<Context> {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      logger.error({ err: error }, 'Unhandled bot error');
      await ctx.reply('Something went wrong. Please try again shortly.');
    }
  };
}
