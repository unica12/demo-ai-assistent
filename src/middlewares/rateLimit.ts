import { Context, MiddlewareFn } from 'telegraf';
import { redis } from '../database/redis';
import { env } from '../config/env';

export function rateLimitMiddleware(): MiddlewareFn<Context> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) {
      return next();
    }

    const key = `rate:${userId}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, env.RATE_LIMIT_WINDOW_SECONDS);
    }

    if (count > env.RATE_LIMIT_MAX_REQUESTS) {
      await ctx.reply('You are sending messages too quickly. Please wait a moment.');
      return;
    }

    await next();
  };
}
