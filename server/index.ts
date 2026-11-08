import { createApp } from './app';
import { config } from './config/env';
import { prisma, checkDatabaseConnection } from './db/prisma';

const app = createApp();

const server = app.listen(config.port, async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 CampusPulse Backend Server Running`);
  console.log(`🌐 Local URL:     http://localhost:${config.port}`);
  console.log(`🩺 Health Check:  http://localhost:${config.port}/api/health`);
  console.log(`📦 Environment:   ${config.nodeEnv}`);
  console.log(`==================================================\n`);

  const dbOk = await checkDatabaseConnection();
  if (dbOk) {
    console.log('✅ PostgreSQL Database connected successfully.');
  } else {
    console.log('ℹ️  PostgreSQL Database not connected yet.');
    console.log('   Follow instructions to set DATABASE_URL and run migrations.');
  }
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Prisma database connection disconnected.');
    } catch (err) {
      console.error('Error during database disconnect:', err);
    }
    process.exit(0);
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('Forceful shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default server;

