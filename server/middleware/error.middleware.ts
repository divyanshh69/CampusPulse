import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';
import { config } from '../config/env';

/**
 * 404 Not Found handler for undefined API routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    `Cannot ${req.method} ${req.originalUrl} - Route not found.`,
    404
  );
}

/**
 * Global centralized error-handling middleware
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled Server Error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message =
    err.message || 'An unexpected internal server error occurred.';

  const payload: any = {};
  if (config.nodeEnv === 'development') {
    payload.stack = err.stack;
  }

  sendError(res, message, statusCode, Object.keys(payload).length ? payload : undefined);
}

