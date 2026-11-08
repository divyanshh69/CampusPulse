import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class DepartmentsController {
  /**
   * Diagnostic status of departments module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'departments',
      status: 'initialized',
      endpoints: [
        'GET /api/departments',
        'GET /api/departments/:id',
        'POST /api/departments',
      ],
    });
  }

  /**
   * List all departments with head info and member counts
   */
  static async listDepartments(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const departments = await prisma.department.findMany({
        include: {
          head: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      const formatted = departments.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description,
        headId: d.headId,
        headName: d.head?.name || 'Unassigned',
        memberCount: d._count.members,
      }));

      sendSuccess(res, formatted);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get department by ID
   */
  static async getDepartmentById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const department = await prisma.department.findUnique({
        where: { id },
        include: {
          head: { select: { id: true, name: true, email: true } },
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              totalCredits: true,
              attendancePercentage: true,
            },
          },
          events: true,
          tasks: true,
        },
      });

      if (!department) {
        sendError(res, 'Department not found.', 404);
        return;
      }

      sendSuccess(res, department);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create department (Admin only)
   */
  static async createDepartment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, code, description, headId } = req.body;

      if (!name || !code || !description) {
        sendError(res, 'Required fields: name, code, description.', 400);
        return;
      }

      const department = await prisma.department.create({
        data: {
          name,
          code: code.toUpperCase(),
          description,
          headId,
        },
      });

      sendSuccess(res, department, 'Department created successfully.', 201);
    } catch (err) {
      next(err);
    }
  }
}

