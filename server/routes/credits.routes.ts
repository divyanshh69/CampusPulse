import { Router } from 'express';
import { CreditsController } from '../controllers/credits.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/status', CreditsController.status);
router.get('/transactions', CreditsController.listTransactions);
router.get('/', CreditsController.listTransactions);
router.post(
  '/adjust',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
  CreditsController.adjustCredits
);

export default router;

