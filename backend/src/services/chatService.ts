import prisma from '../db/client';
import { generateReply, ChatHistoryMessage } from './llmService';

interface ChatMessageResult {
  reply: string;
  sessionId: string;
}

/**
 * Retrieves the full chat history for a session, ordered by time.
 */
export async function getConversationHistory(sessionId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation session not found');
  }

  return conversation.messages.map((msg) => ({
    id: msg.id,
    sender: msg.sender as 'user' | 'ai',
    text: msg.text,
    timestamp: msg.timestamp,
  }));
}

/**
 * Handles incoming customer messages, updates state, and generates AI answers.
 */
export async function handleUserMessage(
  message: string,
  sessionId?: string
): Promise<ChatMessageResult> {
  let conversationId = sessionId;

  // Validate or create conversation session
  if (conversationId) {
    const exists = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!exists) {
      // If sessionId was provided but not found, create a conversation with this ID
      const newConv = await prisma.conversation.create({
        data: { id: conversationId },
      });
      conversationId = newConv.id;
    }
  } else {
    // If no sessionId was provided, create a new one
    const newConv = await prisma.conversation.create({
      data: {},
    });
    conversationId = newConv.id;
  }

  // Save the user's message to the database
  await prisma.message.create({
    data: {
      conversationId,
      sender: 'user',
      text: message,
    },
  });

  // Retrieve the last 10 messages for conversation context (cost control & memory limit)
  const pastMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: 'desc' },
    take: 11, // Take 11 so we exclude the current message and get up to 10 previous ones
  });

  // Reverse to chronological order and exclude the current message we just added
  const historyRaw = pastMessages
    .reverse()
    .filter((msg) => msg.text !== message || msg.sender !== 'user');

  const history: ChatHistoryMessage[] = historyRaw.slice(-10).map((msg) => ({
    sender: msg.sender as 'user' | 'ai',
    text: msg.text,
  }));

  // Fetch FAQ domain knowledge from DB
  const knowledgeEntries = await prisma.knowledge.findMany();
  const knowledgeContext = knowledgeEntries
    .map((entry) => `[Category: ${entry.key}]\n${entry.value}`)
    .join('\n\n');

  // Build system instructions with context
  const systemPrompt = `You are a helpful, professional, and concise customer support AI assistant for "Spur Goods", a premium e-commerce store.

Here is the official domain knowledge/FAQs for our store:
${knowledgeContext}

Strict Guidelines:
1. Answer customer questions accurately using the provided store policies.
2. If a customer asks a question unrelated to the store, shipping, returns, support hours, or minimalist tech accessories (e.g. general math, programming, jokes, or other services), politely decline to answer. Explain that you are the Spur Goods support assistant and can only help with our store questions.
3. Keep your answers concise, clear, and easy to read. Use bullet points if appropriate.
4. If a question cannot be answered using the provided policies (e.g., specific order tracking, complaints), politely tell the customer to reach out to our team at support@spurgoods.com during support hours.`;

  // Call the LLM to get a reply
  let reply = '';
  try {
    reply = await generateReply(history, message, systemPrompt);
  } catch (err: any) {
    // If LLM fails, we log it and rethrow to controller, but we DO NOT save a half-broken message
    console.error(`[Chat Service] LLM generation failed for session ${conversationId}:`, err);
    throw err;
  }

  // Save the AI's generated reply to the database
  await prisma.message.create({
    data: {
      conversationId,
      sender: 'ai',
      text: reply,
    },
  });

  return {
    reply,
    sessionId: conversationId,
  };
}
