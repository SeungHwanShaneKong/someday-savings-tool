import OpenAI from 'https://esm.sh/openai@4.77.0';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set. Set it in Supabase Dashboard → Edge Function secrets.');
}

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const DEFAULT_MODEL = 'gpt-4.1-mini';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: options?.model ?? DEFAULT_MODEL,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  });

  return response.choices[0]?.message?.content ?? '';
}
