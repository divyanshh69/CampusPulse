import { Router } from 'express';
import { DepartmentsController } from '../controllers/departments.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/status', DepartmentsController.status);
router.get('/', DepartmentsController.listDepartments);
router.get('/:id', DepartmentsController.getDepartmentById);
router.post(
  '/',
  requireAuth,
  requireRole([UserRole.ADMIN]),
  DepartmentsController.createDepartment
);

export default router;

