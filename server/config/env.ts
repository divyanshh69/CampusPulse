import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: string;
}

const DEV_FALLBACK_SECRET =
  'campuspulse-dev-secret-key-change-this-in-production-min32chars';

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret =
  process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : DEV_FALLBACK_SECRET);

// Strict validation: Production startup MUST fail if JWT_SECRET is unsafe or missing
if (nodeEnv === 'production') {
  if (!jwtSecret || jwtSecret === DEV_FALLBACK_SECRET || jwtSecret.length < 32) {
    throw new Error(
      'FATAL CONFIGURATION ERROR: A secure, unique JWT_SECRET of at least 32 characters must be configured in production.'
    );
  }
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/campuspulse?schema=public',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

