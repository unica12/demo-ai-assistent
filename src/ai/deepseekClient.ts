import { env } from '../config/env';

export type DeepSeekMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function createDeepSeekChatCompletion(
  messages: DeepSeekMessage[],
  temperature: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL,
        messages,
        temperature,
        top_p: 0.9
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await safeReadBody(response);
      throw new Error(
        `DeepSeek request failed: ${response.status} ${response.statusText} ${errorBody}`
      );
    }

    const data = (await response.json()) as DeepSeekChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek response missing message content');
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text ? `- ${text}` : '';
  } catch {
    return '';
  }
}
