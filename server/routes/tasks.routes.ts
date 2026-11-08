import { Router } from 'express';
import { TasksController } from '../controllers/tasks.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/status', TasksController.status);
router.get('/', TasksController.listTasks);
router.post(
  '/',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  TasksController.createTask
);
router.patch('/:id/status', requireAuth, TasksController.updateStatus);

export default router;

