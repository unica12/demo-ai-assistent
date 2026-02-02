import { openai } from './openaiClient';
import { aiResponseSchema, ChatMessage, AIResponse } from '../types/ai';
import { env } from '../config/env';
import { systemPrompt } from '../config/systemPrompt';
import { logger } from '../utils/logger';

const fallbackResponse: AIResponse = {
  reply: 'Спасибо, что написали! Подскажите, пожалуйста, что именно вам нужно?',
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

    const parsed = aiResponseSchema.safeParse(parseJsonResponse(content));
    if (!parsed.success) {
      logger.warn({ error: parsed.error }, 'AI response validation failed');
      return {
        ...fallbackResponse,
        reply: content
      };
    }

    return parsed.data;
  } catch (error) {
    logger.error({ error }, 'AI request failed');
    return fallbackResponse;
  }
}

function parseJsonResponse(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = content.slice(start, end + 1);
      return JSON.parse(slice);
    }
    return null;
  }
}
