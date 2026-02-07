import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  DEEPSEEK_API_KEY: z.string().min(1),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  DEEPSEEK_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.75),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  MANAGER_CHAT_ID: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SYSTEM_PROMPT_OVERRIDE: z.string().optional(),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.flatten().fieldErrors;
  throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted)}`);
}

export const env = parsed.data;
