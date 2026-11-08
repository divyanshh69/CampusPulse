import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp(): Application {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Allow configured origin and local dev ports
        const allowedOrigins = [
          config.corsOrigin,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:5173',
        ];

        if (allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} not allowed by CORS.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Basic request logger in development
  if (config.nodeEnv === 'development') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
        );
      });
      next();
    });
  }

  // Root welcome route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'CampusPulse API Server',
      version: '1.0.0',
      description: 'College Club Management Platform Backend API',
      health: '/api/health',
      documentation: {
        auth: '/api/auth/status',
        members: '/api/members/status',
        departments: '/api/departments/status',
        events: '/api/events/status',
        attendance: '/api/attendance/status',
        credits: '/api/credits/status',
        tasks: '/api/tasks/status',
        activities: '/api/activities/status',
      },
    });
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Catch-all 404 handler
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

export default createApp;

