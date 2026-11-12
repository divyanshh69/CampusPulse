import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/status', AttendanceController.status);
router.get('/', requireAuth, AttendanceController.listAttendance);
router.get('/event/:eventId', requireAuth, AttendanceController.getEventAttendance);
router.post(
  '/mark',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  AttendanceController.markAttendance
);
router.post(
  '/mark-all-present',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  AttendanceController.markAllPresent
);

export default router;
