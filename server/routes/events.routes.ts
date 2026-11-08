import { Router } from 'express';
import { EventsController } from '../controllers/events.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/status', EventsController.status);
router.get('/', EventsController.listEvents);
router.get('/:id', EventsController.getEventById);

router.post(
  '/',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  EventsController.createEvent
);

router.patch(
  '/:id',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  EventsController.updateEvent
);

router.delete(
  '/:id',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  EventsController.deleteEvent
);

export default router;
