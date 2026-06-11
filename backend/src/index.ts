import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import chatRoutes from './routes/chatRoutes';
import prisma from './db/client';

const app = express();

// Trust Render's proxy to get the correct client IP for rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/chat', chatRoutes);

// General status check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

/**
 * Bootstrap database connection and start Express server
 */
async function bootstrap() {
  try {
    // Attempt connection
    await prisma.$connect();
    console.log('[Database] Connected to SQLite database successfully.');

    // Auto-seed FAQ context if table is empty, ensuring immediate out-of-the-box operation
    const knowledgeCount = await prisma.knowledge.count();
    if (knowledgeCount === 0) {
      console.log('[Database] Knowledge base is empty. Running auto-seed for policies...');
      const faqs = [
        {
          key: 'store_info',
          value: "Welcome to Spur Goods! We sell premium, minimalist tech accessories, workspace essentials, and leather goods designed for creators and professionals. We are located online at spurgoods.com."
        },
        {
          key: 'shipping_policy',
          value: "We offer free shipping on all orders over $50 within the United States. For orders below $50, standard shipping is a flat rate of $4.99. Standard shipping takes 3 to 5 business days. We also offer expedited 2-day shipping for $14.99. International shipping is available to most countries for a flat rate of $19.99 and takes 7 to 14 business days."
        },
        {
          key: 'return_policy',
          value: "We want you to love your purchase. If you're not completely satisfied, you can return any unused and undamaged items in their original packaging within 30 days of delivery for a full refund or exchange. Return shipping is free for US customers. Once we receive your item, refunds are processed back to your original payment method within 5 to 7 business days."
        },
        {
          key: 'support_hours',
          value: "Our customer support team is happy to help! You can chat with us live on our website Monday through Friday, from 9:00 AM to 6:00 PM Eastern Time (EST). If you contact us outside of these hours, please leave your email address in the chat, or send an email to support@spurgoods.com, and we will get back to you within 24 business hours."
        }
      ];

      for (const faq of faqs) {
        await prisma.knowledge.create({
          data: faq
        });
      }
      console.log('[Database] Seeded 4 default policy entries.');
    }

    app.listen(config.port, () => {
      console.log(`[Server] Express server running at http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('[Bootstrap] Failed to initialize server:', error);
    process.exit(1);
  }
}

bootstrap();
