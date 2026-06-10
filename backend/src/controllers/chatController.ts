import { Request, Response } from 'express';
import { handleUserMessage, getConversationHistory } from '../services/chatService';
import prisma from '../db/client';

/**
 * Exposes endpoint POST /api/chat/message
 * Accepts { message: string, sessionId?: string }
 * Returns { reply: string, sessionId: string, warning?: string }
 */
export async function postChatMessage(req: Request, res: Response): Promise<void> {
  try {
    const { message, sessionId } = req.body;

    // 1. Validate input exists and is a string
    if (message === undefined || message === null) {
      res.status(400).json({ error: 'Message payload is required.' });
      return;
    }

    if (typeof message !== 'string') {
      res.status(400).json({ error: 'Message must be a string value.' });
      return;
    }

    // 2. Reject empty or whitespace-only messages
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    // 3. Handle very long messages sensibly (truncate and warn, but still work)
    let processedMessage = trimmedMessage;
    let warning: string | undefined;

    if (trimmedMessage.length > 1000) {
      console.warn(`[Chat Controller] Input exceeded limit of 1000 chars (length: ${trimmedMessage.length}). Truncating.`);
      processedMessage = trimmedMessage.substring(0, 1000) + '... [truncated for chat limits]';
      warning = 'Your message was truncated to 1000 characters to ensure system efficiency.';
    }

    // Validate sessionId format if provided (prevent DB injection/malformed UUIDs causing crashes)
    if (sessionId && (typeof sessionId !== 'string' || sessionId.trim().length === 0)) {
      res.status(400).json({ error: 'Session ID must be a valid string.' });
      return;
    }

    // 4. Call service layer and return reply
    const result = await handleUserMessage(processedMessage, sessionId?.trim());

    res.status(200).json({
      reply: result.reply,
      sessionId: result.sessionId,
      ...(warning ? { warning } : {}),
    });
  } catch (error: any) {
    // 5. Backend never crashes. Log error detail on server, return clean message to user.
    console.error('[Chat Controller] Unexpected exception in postChatMessage:', error);

    const errorMessage = error?.message || 'An internal server error occurred.';
    res.status(500).json({
      error: `Failed to process message: ${errorMessage}`,
    });
  }
}

/**
 * Exposes endpoint GET /api/chat/history/:sessionId
 * Returns the past message list for the session
 */
export async function getChatHistory(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    if (!sessionId || sessionId.trim().length === 0) {
      res.status(400).json({ error: 'Session ID is required.' });
      return;
    }

    const messages = await getConversationHistory(sessionId.trim());
    res.status(200).json({
      sessionId,
      messages,
    });
  } catch (error: any) {
    console.error(`[Chat Controller] Error retrieving history for session ${req.params.sessionId}:`, error);
    
    // Return friendly status codes depending on the error
    if (error?.message?.includes('not found')) {
      res.status(404).json({ error: 'Session history not found.' });
    } else {
      res.status(500).json({ error: 'Failed to retrieve chat history.' });
    }
  }
}

/**
 * Exposes endpoint DELETE /api/chat/session/:sessionId
 * Deletes the conversation and cascaded messages from database
 */
export async function deleteChatSession(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    if (!sessionId || sessionId.trim().length === 0) {
      res.status(400).json({ error: 'Session ID is required.' });
      return;
    }

    // Delete conversation from database (cascades and deletes associated messages)
    await prisma.conversation.delete({
      where: { id: sessionId.trim() },
    });

    res.status(200).json({ success: true, message: 'Session deleted successfully.' });
  } catch (error: any) {
    console.error(`[Chat Controller] Error deleting session ${req.params.sessionId}:`, error);
    
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Session not found in database.' });
    } else {
      res.status(500).json({ error: 'Failed to delete chat session.' });
    }
  }
}
