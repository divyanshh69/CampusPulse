import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config/env';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  departmentId: string;
  name?: string;
}

/**
 * Signs a JWT token containing authenticated user identity and role.
 */
export function signToken(payload: AuthUserPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as any,
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

/**
 * Verifies and decodes a signed JWT token.
 * Throws an error if invalid or expired.
 */
export function verifyToken(token: string): AuthUserPayload {
  return jwt.verify(token, config.jwtSecret) as AuthUserPayload;
}

