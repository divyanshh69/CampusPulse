import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple PrismaClient instances in development due to hot reloading
export const prisma: PrismaClient =
  global.__prisma ||
  new PrismaClient({
    log:
      config.nodeEnv === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (config.nodeEnv !== 'production') {
  global.__prisma = prisma;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

