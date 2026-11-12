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
 * Safely sanitizes errors for client responses while preserving server logs.
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Preserve full server-side diagnostic logging
  console.error('[SERVER ERROR]', err);

  // Handle Prisma Validation Errors safely
  if (err?.name === 'PrismaClientValidationError') {
    sendError(
      res,
      'Invalid request payload or unrecognized schema parameter.',
      400
    );
    return;
  }

  // Handle Prisma Known Database Request Errors
  if (err?.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      sendError(res, 'A record with these unique details already exists.', 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'The requested resource could not be found.', 404);
      return;
    }
    sendError(res, 'Database operation could not be completed.', 400);
    return;
  }

  // Handle JWT & Auth errors
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    sendError(res, 'Authentication token is invalid or has expired.', 401);
    return;
  }

  const statusCode =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.statusCode === 'number'
      ? err.statusCode
      : 500;

  // Never expose server file paths or database stack traces in client response
  const clientMessage =
    statusCode >= 500
      ? 'An internal server error occurred. Please try again later.'
      : err?.message || 'Request could not be processed.';

  sendError(res, clientMessage, statusCode);
}

