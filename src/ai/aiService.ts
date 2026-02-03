import { openai } from './openaiClient';
import { aiResponseSchema, ChatMessage, AIResponse } from '../types/ai';
import { env } from '../config/env';
import { systemPrompt } from '../config/systemPrompt';
import { logger } from '../utils/logger';

const MAX_RECENT_ASSISTANT_MESSAGES = 5;
const RETRY_SYSTEM_NOTICE =
  'Your previous response was invalid JSON. Return a valid JSON object only, with the required keys.';

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
    logger.error({ error }, 'AI request failed');
    throw error;
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
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: env.OPENAI_TEMPERATURE,
    top_p: 0.9,
    messages,
    response_format: { type: 'json_object' }
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty AI response');
  }
  return content;
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
