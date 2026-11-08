import { Router } from 'express';
import { MembersController } from '../controllers/members.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/status', MembersController.status);
router.get('/leaderboard', MembersController.getLeaderboard);
router.get('/', MembersController.listMembers);
router.get('/:id', MembersController.getMemberById);

// Protected routes requiring ADMIN or DEPARTMENT_HEAD authorization
router.post(
  '/',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  MembersController.createMember
);

router.patch(
  '/:id',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  MembersController.updateMember
);

router.delete(
  '/:id',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  MembersController.deactivateMember
);

export default router;
