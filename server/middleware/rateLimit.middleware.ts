import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipAttempts = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes to prevent memory leak
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipAttempts.entries()) {
    if (now > record.resetTime) {
      ipAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * In-memory sliding rate limiter for sensitive endpoints (e.g. login, register, password change)
 * Defaults to max 15 requests per 60 seconds window.
 */
export function rateLimiter({
  windowMs = 60 * 1000,
  maxRequests = 15,
  message = 'Too many authentication attempts. Please wait a minute before retrying.',
}: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
} = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Use Express's validated req.ip (strictly governed by configured trust-proxy topology)
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown-client';

    const now = Date.now();
    const record = ipAttempts.get(clientIp);

    if (!record || now > record.resetTime) {
      ipAttempts.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      sendError(res, message, 429, { retryAfter: retryAfterSec });
      return;
    }

    record.count += 1;
    next();
  };
}

