import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthUserPayload } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';

// Extend Express Request interface to include the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Middleware that strictly enforces JWT authentication.
 * Rejects requests with 401 Unauthorized if the token is missing or invalid.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(
      res,
      'Authentication required: Missing or malformed Bearer token.',
      401
    );
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Authentication token has expired. Please sign in again.', 401);
      return;
    }
    sendError(res, 'Invalid authentication token.', 401);
  }
}

/**
 * Middleware that parses JWT if provided, but does not block requests if unauthenticated.
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch {
      // Ignored for optional auth
    }
  }

  next();
}

