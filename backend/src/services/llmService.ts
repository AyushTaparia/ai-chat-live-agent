import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getLLMProvider } from '../config/env';

export interface ChatHistoryMessage {
  sender: 'user' | 'ai';
  text: string;
}

/**
 * Calls the selected LLM provider to generate a response.
 * Handles timeouts and exceptions, and returns clean error messages.
 */
export async function generateReply(
  history: ChatHistoryMessage[],
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  const { provider, apiKey } = getLLMProvider();

  if (provider === 'none' || !apiKey) {
    console.warn('[LLM Service] No API keys configured. Running in fallback mode.');
    return (
      "Hello! I'm sorry, but our live support assistant is currently undergoing routine maintenance and is temporarily offline. " +
      "In the meantime, feel free to check out our product catalog, or send us an email directly at support@spurgoods.com. " +
      "We will get back to you as soon as possible during our normal business hours (Mon-Fri, 9:00 AM - 6:00 PM EST).\n\n" +
      "Thank you for your patience!"
    );
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`[LLM Service] Sending prompt to ${provider.toUpperCase()} (Attempt ${attempt}/${maxRetries})...`);

      // Define a timeout promise (15 seconds) to ensure the server never hangs indefinitely
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM Request Timeout (15s exceeded)')), 15000)
      );

      let reply = '';

      if (provider === 'gemini') {
        reply = await Promise.race([
          callGemini(apiKey, history, userMessage, systemPrompt),
          timeoutPromise
        ]);
      } else if (provider === 'openai') {
        reply = await Promise.race([
          callOpenAI(apiKey, history, userMessage, systemPrompt),
          timeoutPromise
        ]);
      } else if (provider === 'anthropic') {
        reply = await Promise.race([
          callAnthropic(apiKey, history, userMessage, systemPrompt),
          timeoutPromise
        ]);
      }

      return reply || "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (error: any) {
      console.error(`[LLM Service] Attempt ${attempt} failed for ${provider.toUpperCase()}:`, error?.message || error);

      const status = error?.status || error?.code;
      const errorMessage = error?.message || '';
      
      // Determine if error is temporary (503 Unavailable, 429 Rate limit, or Timeout)
      const isTemporary = 
        status === 503 || 
        status === 429 || 
        errorMessage.includes('503') || 
        errorMessage.includes('429') || 
        errorMessage.includes('high demand') || 
        errorMessage.includes('Timeout') || 
        errorMessage.includes('UNAVAILABLE') || 
        errorMessage.includes('temporarily');

      if (isTemporary && attempt < maxRetries) {
        const backoffDelay = attempt * 1000; // 1s, 2s, etc.
        console.warn(`[LLM Service] Temporary error encountered. Retrying in ${backoffDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }

      // If we reach here, we've encountered a fatal error or run out of retries.
      // Fallback to local mock simulator rather than failing with a 500 error!
      console.warn(`[LLM Service] LLM API calls failed (Quota/Billing/Timeout). Returning local mock fallback response.`);
      return callLocalMockFallback(userMessage);
    }
  }

  console.warn(`[LLM Service] LLM retries exhausted. Returning local mock fallback response.`);
  return callLocalMockFallback(userMessage);
}

/**
 * Gemini API Integration
 */
async function callGemini(
  apiKey: string,
  history: ChatHistoryMessage[],
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  // Map history to Gemini content roles
  const contents = history.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  // Append new user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 500,
      temperature: 0.7,
    },
  });

  return response.text || '';
}

/**
 * OpenAI API Integration
 */
async function callOpenAI(
  apiKey: string,
  history: ChatHistoryMessage[],
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((msg) => ({
      role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.text,
    })),
    { role: 'user', content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * Anthropic API Integration
 */
async function callAnthropic(
  apiKey: string,
  history: ChatHistoryMessage[],
  userMessage: string,
  systemPrompt: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  const messages = history.map((msg) => ({
    role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
    content: msg.text,
  }));

  messages.push({
    role: 'user',
    content: userMessage,
  });

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    system: systemPrompt,
    messages,
    temperature: 0.7,
  });

  // Extract text content from Anthropic response block
  const textContent = response.content
    .filter((block) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  return textContent;
}

/**
 * Local backup mockup simulator used when API keys exceed quotas or fail connection.
 */
function callLocalMockFallback(userMessage: string): string {
  const msg = userMessage.toLowerCase().trim();

  if (msg.includes('shipping') || msg.includes('delivery') || msg.includes('ship')) {
    return (
      "Here are our official shipping rates:\n\n" +
      "*   **United States:**\n" +
      "    *   Free shipping on orders over $50.\n" +
      "    *   Standard shipping (3-5 business days) for orders under $50: $4.99.\n" +
      "    *   Expedited 2-day shipping: $14.99.\n" +
      "*   **International:**\n" +
      "    *   Flat rate: $19.99 (7-14 business days)."
    );
  }

  if (msg.includes('return') || msg.includes('refund') || msg.includes('exchange')) {
    return (
      "Here is our return/refund policy:\n\n" +
      "*   We want you to love your purchase! You can return unused, undamaged items in their original packaging within 30 days of delivery for a full refund or exchange.\n" +
      "*   Return shipping is free for US customers.\n" +
      "*   Refunds are processed back to your original payment method within 5 to 7 business days after we receive your item."
    );
  }

  if (msg.includes('hour') || msg.includes('time') || msg.includes('when') || msg.includes('support') || msg.includes('email') || msg.includes('contact')) {
    return (
      "Here are our support hours and contact details:\n\n" +
      "*   Our support team is available live Monday through Friday, from 9:00 AM to 6:00 PM Eastern Time (EST).\n" +
      "*   You can contact us via this chat or by email at support@spurgoods.com. Outside of business hours, please leave your email here or write to us, and we will get back to you within 24 business hours."
    );
  }

  if (msg.includes('python') || msg.includes('script') || msg.includes('code') || msg.includes('joke') || msg.includes('write')) {
    return "I am the Spur Goods support assistant and can only help with questions related to our store policies. I cannot write python scripts or tell jokes.";
  }

  return (
    "Thank you for contacting Spur Goods! (Note: Running in local policy backup mode due to LLM quota constraints).\n\n" +
    "How can I help you today? I can answer questions regarding:\n\n" +
    "*   **Shipping rates** (US/International, free over $50)\n" +
    "*   **Return policies** (30-day window, free US returns)\n" +
    "*   **Support hours** (Mon-Fri 9AM-6PM EST, support@spurgoods.com)"
  );
}
