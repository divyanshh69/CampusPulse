import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { TaskStatus, TaskPriority, CreditCategory } from '@prisma/client';

export class TasksController {
  /**
   * Diagnostic status of tasks module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'tasks',
      status: 'initialized',
      endpoints: [
        'GET /api/tasks',
        'GET /api/tasks/:id',
        'POST /api/tasks',
        'PATCH /api/tasks/:id/status',
      ],
    });
  }

  /**
   * List tasks with optional filtering
   */
  static async listTasks(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status, priority, departmentId, assignedToId } = req.query;

      const where: any = {};
      if (status && typeof status === 'string' && status !== 'All') {
        where.status = status as TaskStatus;
      }
      if (priority && typeof priority === 'string' && priority !== 'All') {
        where.priority = priority as TaskPriority;
      }
      if (departmentId && typeof departmentId === 'string') {
        where.departmentId = departmentId;
      }
      if (assignedToId && typeof assignedToId === 'string') {
        where.assignedToId = assignedToId;
      }

      const tasks = await prisma.clubTask.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { deadline: 'asc' },
      });

      const formatted = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedTo.name,
        departmentId: t.departmentId,
        department: t.department.name,
        deadline: t.deadline,
        status: t.status,
        priority: t.priority,
        creditValue: t.creditValue,
      }));

      sendSuccess(res, formatted);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create new task
   */
  static async createTask(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        title,
        description,
        assignedToId,
        departmentId,
        deadline,
        priority,
        creditValue,
      } = req.body;

      if (!title || !assignedToId || !departmentId || !deadline) {
        sendError(
          res,
          'Required fields: title, assignedToId, departmentId, deadline.',
          400
        );
        return;
      }

      const task = await prisma.clubTask.create({
        data: {
          title,
          description: description || '',
          assignedToId,
          departmentId,
          deadline,
          priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
          creditValue: creditValue ? parseInt(creditValue, 10) : 20,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      });

      sendSuccess(res, task, 'Task created successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update task status (cycles through status and awards credits if completed)
   */
  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        sendError(res, 'Required field: status.', 400);
        return;
      }

      const existing = await prisma.clubTask.findUnique({
        where: { id },
      });

      if (!existing) {
        sendError(res, 'Task not found.', 404);
        return;
      }

      const wasCompleted = existing.status === TaskStatus.COMPLETED;
      const isNowCompleted = status === TaskStatus.COMPLETED;

      // Update task status
      const updatedTask = await prisma.clubTask.update({
        where: { id },
        data: { status: status as TaskStatus },
        include: { assignedTo: true, department: true },
      });

      // Award credits if newly completed
      if (!wasCompleted && isNowCompleted && existing.creditValue > 0) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: existing.assignedToId },
            data: { totalCredits: { increment: existing.creditValue } },
          }),
          prisma.creditTransaction.create({
            data: {
              memberId: existing.assignedToId,
              delta: existing.creditValue,
              reason: `Completed task: ${existing.title}`,
              category: CreditCategory.TASK_COMPLETION,
              issuedBy: req.user?.name || 'System Automation',
            },
          }),
        ]);
      }

      sendSuccess(res, updatedTask, `Task status updated to ${status}.`);
    } catch (err) {
      next(err);
    }
  }
}

