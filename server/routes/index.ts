import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../db/prisma';
import { sendSuccess } from '../utils/apiResponse';
import authRoutes from './auth.routes';
import membersRoutes from './members.routes';
import departmentsRoutes from './departments.routes';
import eventsRoutes from './events.routes';
import attendanceRoutes from './attendance.routes';
import creditsRoutes from './credits.routes';
import tasksRoutes from './tasks.routes';
import activitiesRoutes from './activities.routes';

const router = Router();

// Health check endpoint
router.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      provider: 'postgresql',
      connected: dbConnected,
    },
    modules: [
      'auth',
      'members',
      'departments',
      'events',
      'attendance',
      'credits',
      'tasks',
      'activities',
    ],
  });
});

// Mount module sub-routers
router.use('/auth', authRoutes);
router.use('/members', membersRoutes);
router.use('/departments', departmentsRoutes);
router.use('/events', eventsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/credits', creditsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/activities', activitiesRoutes);

export default router;

