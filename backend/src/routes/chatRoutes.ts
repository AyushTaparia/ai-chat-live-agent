import { Router } from 'express';
import { postChatMessage, getChatHistory, deleteChatSession } from '../controllers/chatController';

const router = Router();

// Route mappings
router.post('/message', postChatMessage);
router.get('/history/:sessionId', getChatHistory);
router.delete('/session/:sessionId', deleteChatSession);

export default router;
