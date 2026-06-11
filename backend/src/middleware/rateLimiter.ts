import { Request, Response, NextFunction } from 'express';

interface TokenBucket {
  tokens: number;
  lastRefilled: number;
}

const buckets = new Map<string, TokenBucket>();

const BUCKET_CAPACITY = 20;
const REFILL_RATE = 15; // 15 tokens refilled
const REFILL_WINDOW_MS = 15 * 60 * 1000; // per 15 minutes
const REFILL_PER_MS = REFILL_RATE / REFILL_WINDOW_MS; // 1 token every 60 seconds (60,000ms)

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();

  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: BUCKET_CAPACITY, lastRefilled: now };
    buckets.set(ip, bucket);
  } else {
    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefilled;
    const refilledTokens = elapsed * REFILL_PER_MS;
    
    if (refilledTokens > 0) {
      bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + refilledTokens);
      bucket.lastRefilled = now;
    }
  }

  // Check if we have at least 1 token to consume
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    next();
  } else {
    res.status(429).json({
      error: 'Too many request, Please try again after some time'
    });
  }
}
