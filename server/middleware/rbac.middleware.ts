import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendError } from '../utils/apiResponse';

/**
 * Restricts access to users holding one of the specified roles.
 * Must be used AFTER requireAuth.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required before checking permissions.', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to perform this action. Required roles: ${allowedRoles.join(', ')}`,
        403
      );
      return;
    }

    next();
  };
}

/**
 * Ensures that Department Heads can only manage resources within their own department,
 * while Admins can manage resources across all departments.
 */
export function requireDepartmentAccess(
  getDepartmentId: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required.', 401);
      return;
    }

    // Admins bypass department boundaries
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    // Department Heads must match the target resource's department
    if (req.user.role === UserRole.DEPARTMENT_HEAD) {
      const targetDeptId = getDepartmentId(req);
      if (!targetDeptId || req.user.departmentId === targetDeptId) {
        next();
        return;
      }

      sendError(
        res,
        'Forbidden: You only have permission to manage records within your assigned department.',
        403
      );
      return;
    }

    sendError(res, 'Forbidden: Insufficient privileges for this department.', 403);
  };
}

