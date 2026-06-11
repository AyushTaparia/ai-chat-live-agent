import { Router } from 'express';
import { postChatMessage, getChatHistory, deleteChatSession } from '../controllers/chatController';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Route mappings
router.post('/message', rateLimiter, postChatMessage);
router.get('/history/:sessionId', getChatHistory);
router.delete('/session/:sessionId', deleteChatSession);

export default router;
