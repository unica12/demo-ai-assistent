import { openai } from './openaiClient';
import { aiResponseSchema, ChatMessage, AIResponse } from '../types/ai';
import { env } from '../config/env';
import { systemPrompt } from '../config/systemPrompt';
import { logger } from '../utils/logger';

const fallbackResponse: AIResponse = {
  reply: 'Thanks for reaching out. Could you share a bit more about what you need?',
  intent: 'cold',
  should_collect_contact: false,
  contact_request_message: ''
};

export async function generateAssistantReply(
  messages: ChatMessage[]
): Promise<AIResponse> {
  const prompt = env.SYSTEM_PROMPT_OVERRIDE?.trim() || systemPrompt;

  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: env.OPENAI_TEMPERATURE,
      messages: [{ role: 'system', content: prompt }, ...messages],
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return fallbackResponse;
    }

    const parsed = aiResponseSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      logger.warn({ error: parsed.error }, 'AI response validation failed');
      return fallbackResponse;
    }

    return parsed.data;
  } catch (error) {
    logger.error({ error }, 'AI request failed');
    return fallbackResponse;
  }
}
