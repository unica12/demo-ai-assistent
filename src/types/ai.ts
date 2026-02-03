import { z } from 'zod';

export const aiResponseSchema = z.object({
  reply: z.string().min(1),
  intent: z.enum(['cold', 'warm', 'hot']),
  should_collect_contact: z.boolean(),
  contact_request_message: z.string()
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
