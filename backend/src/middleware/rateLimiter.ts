import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// In-memory rate limiting (for MVP - replace with Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Get user identifier (IP address for anonymous, userId for authenticated)
  const identifier = req.headers['x-user-id'] as string || req.ip || 'unknown';
  
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  const userLimit = rateLimitStore.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + hourInMs,
    });
    return next();
  }
  
  if (userLimit.count >= config.rateLimit.requestsPerHour) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.',
      retryAfter,
    });
  }
  
  userLimit.count++;
  next();
};
