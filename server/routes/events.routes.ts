import { Router } from 'express';
import { EventsController } from '../controllers/events.controller';
import { RegistrationsController } from '../controllers/registrations.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/status', EventsController.status);
router.get('/registrations/status', RegistrationsController.status);

// My Registrations (Must be mounted before /:id)
router.get('/my-registrations', requireAuth, RegistrationsController.getMyRegistrations);

router.get('/', EventsController.listEvents);
router.get('/:id', EventsController.getEventById);

// Event Registration Sub-routes
router.get('/:eventId/registrations', requireAuth, RegistrationsController.getEventRegistrations);
router.post('/:eventId/register', requireAuth, RegistrationsController.registerForEvent);
router.delete('/:eventId/register', requireAuth, RegistrationsController.cancelRegistration);

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
