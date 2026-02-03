import { createDeepSeekChatCompletion, DeepSeekMessage } from './deepseekClient';
import { aiResponseSchema, ChatMessage, AIResponse } from '../types/ai';
import { env } from '../config/env';
import { systemPrompt } from '../config/systemPrompt';
import { logger } from '../utils/logger';

const MAX_RECENT_ASSISTANT_MESSAGES = 5;
const MAX_AI_RETRIES = 2;
const RETRY_SYSTEM_NOTICE =
  'Your previous response was invalid JSON. Return a valid JSON object only, with the required keys.';
const NO_RESPONSE_FORMAT_NOTICE =
  'Return a valid JSON object only, with the required keys and no extra text.';
const SERVICE_UNAVAILABLE_RESPONSE: AIResponse = {
  reply:
    'Сейчас сервис временно недоступен. Попробуйте, пожалуйста, чуть позже.',
  intent: 'cold',
  should_collect_contact: false,
  contact_request_message: ''
};

export async function generateAssistantReply(
  messages: ChatMessage[]
): Promise<AIResponse> {
  const prompt = env.SYSTEM_PROMPT_OVERRIDE?.trim() || systemPrompt;

  try {
    const baseMessages: ChatMessage[] = [
      { role: 'system', content: prompt },
      ...buildAntiRepetitionMessages(messages),
      ...messages
    ];

    const content = await requestStructuredReply(baseMessages);
    const parsed = aiResponseSchema.safeParse(parseJsonResponse(content));
    if (parsed.success) {
      return parsed.data;
    }

    logger.warn({ error: parsed.error }, 'AI response validation failed');

    const retryContent = await requestStructuredReply([
      ...baseMessages,
      { role: 'system', content: RETRY_SYSTEM_NOTICE }
    ]);
    const retryParsed = aiResponseSchema.safeParse(
      parseJsonResponse(retryContent)
    );
    if (retryParsed.success) {
      return retryParsed.data;
    }

    logger.warn(
      { error: retryParsed.error },
      'AI response validation failed after retry'
    );
    throw new Error('AI response validation failed after retry');
  } catch (error) {
    logger.error({ err: error }, 'AI request failed');
    return SERVICE_UNAVAILABLE_RESPONSE;
  }
}

function buildAntiRepetitionMessages(messages: ChatMessage[]): ChatMessage[] {
  const recentAssistantMessages = messages
    .filter((message) => message.role === 'assistant')
    .slice(-MAX_RECENT_ASSISTANT_MESSAGES)
    .map((message) => message.content.trim())
    .filter(Boolean);

  if (recentAssistantMessages.length === 0) {
    return [];
  }

  return [
    {
      role: 'system',
      content: `Recent assistant messages:\n${recentAssistantMessages
        .map((message) => `- ${message}`)
        .join('\n')}\nDo not reuse their sentence structures or opening phrases.`
    }
  ];
}

async function requestStructuredReply(messages: ChatMessage[]): Promise<string> {
  for (let attempt = 1; attempt <= MAX_AI_RETRIES; attempt += 1) {
    try {
      const payloadMessages: DeepSeekMessage[] =
        attempt === 1
          ? messages
          : [
              ...messages,
              { role: 'system', content: NO_RESPONSE_FORMAT_NOTICE }
            ];
      const content = await createDeepSeekChatCompletion(
        payloadMessages,
        env.DEEPSEEK_TEMPERATURE
      );
      logger.debug(
        { attempt, contentPreview: content.slice(0, 200) },
        'AI response content preview'
      );
      return content;
    } catch (error) {
      logger.warn({ err: error, attempt }, 'AI request attempt failed');
      if (attempt === MAX_AI_RETRIES) {
        throw error;
      }
    }
  }

  throw new Error('AI request retries exhausted');
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
