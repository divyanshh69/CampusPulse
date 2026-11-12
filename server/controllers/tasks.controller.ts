import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { TaskStatus, TaskPriority, CreditCategory, ActivityCategory, UserRole } from '@prisma/client';

function mapTaskStatus(input: any): TaskStatus | null {
  if (!input) return null;
  const str = String(input).trim().toUpperCase().replace(/[\s-]/g, '_');
  if (str === 'TO_DO' || str === 'TODO') return TaskStatus.TO_DO;
  if (str === 'IN_PROGRESS' || str === 'INPROGRESS') return TaskStatus.IN_PROGRESS;
  if (str === 'UNDER_REVIEW' || str === 'UNDERREVIEW') return TaskStatus.UNDER_REVIEW;
  if (str === 'COMPLETED' || str === 'COMPLETE') return TaskStatus.COMPLETED;
  return null;
}

function formatTaskStatus(st: TaskStatus): 'To Do' | 'In Progress' | 'Under Review' | 'Completed' {
  switch (st) {
    case TaskStatus.IN_PROGRESS:
      return 'In Progress';
    case TaskStatus.UNDER_REVIEW:
      return 'Under Review';
    case TaskStatus.COMPLETED:
      return 'Completed';
    case TaskStatus.TO_DO:
    default:
      return 'To Do';
  }
}

function mapTaskPriority(input: any): TaskPriority {
  if (!input) return TaskPriority.MEDIUM;
  const str = String(input).trim().toUpperCase();
  if (str === 'HIGH') return TaskPriority.HIGH;
  if (str === 'LOW') return TaskPriority.LOW;
  return TaskPriority.MEDIUM;
}

function formatTaskPriority(pri: TaskPriority): 'High' | 'Medium' | 'Low' {
  switch (pri) {
    case TaskPriority.HIGH:
      return 'High';
    case TaskPriority.LOW:
      return 'Low';
    case TaskPriority.MEDIUM:
    default:
      return 'Medium';
  }
}

function formatTaskResponse(t: any) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    assignedToId: t.assignedToId,
    assignedToName: t.assignedTo?.name || 'Unassigned',
    departmentId: t.departmentId,
    department: t.department?.name || 'Technical & Engineering',
    deadline: t.deadline,
    status: formatTaskStatus(t.status),
    priority: formatTaskPriority(t.priority),
    creditValue: t.creditValue,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

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
   * List tasks with role-based visibility and optional filtering
   */
  static async listTasks(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, 'Authentication required to view tasks.', 401);
        return;
      }

      const { status, priority, departmentId, assignedToId } = req.query;

      const where: any = {};

      // Role-based visibility enforcement
      if (user.role === UserRole.MEMBER) {
        // Members may only see tasks assigned to them
        where.assignedToId = user.userId;
      } else if (user.role === UserRole.DEPARTMENT_HEAD) {
        // Department heads are scoped to their assigned department
        where.departmentId = user.departmentId;
        if (assignedToId && typeof assignedToId === 'string') {
          where.assignedToId = assignedToId;
        }
      } else if (user.role === UserRole.ADMIN) {
        // Admins can see all tasks or apply arbitrary filters
        if (departmentId && typeof departmentId === 'string' && departmentId !== 'All') {
          where.departmentId = departmentId;
        }
        if (assignedToId && typeof assignedToId === 'string') {
          where.assignedToId = assignedToId;
        }
      }

      if (status && typeof status === 'string' && status !== 'All') {
        const mapped = mapTaskStatus(status);
        if (mapped) where.status = mapped;
      }
      if (priority && typeof priority === 'string' && priority !== 'All') {
        where.priority = mapTaskPriority(priority);
      }

      const tasks = await prisma.clubTask.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { deadline: 'asc' },
      });

      sendSuccess(res, tasks.map(formatTaskResponse));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single task by ID
   */
  static async getTaskById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;

      if (!user) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const task = await prisma.clubTask.findUnique({
        where: { id },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      });

      if (!task) {
        sendError(res, 'Task not found.', 404);
        return;
      }

      if (user.role === UserRole.MEMBER && task.assignedToId !== user.userId) {
        sendError(res, 'Forbidden: You cannot view tasks assigned to other members.', 403);
        return;
      }
      if (user.role === UserRole.DEPARTMENT_HEAD && task.departmentId !== user.departmentId) {
        sendError(res, 'Forbidden: You cannot view tasks belonging to other departments.', 403);
        return;
      }

      sendSuccess(res, formatTaskResponse(task));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create new task with RBAC enforcement
   */
  static async createTask(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const {
        title,
        description,
        assignedToId,
        departmentId,
        deadline,
        priority,
        creditValue,
      } = req.body;

      if (!title || !assignedToId || !deadline) {
        sendError(
          res,
          'Required fields: title, assignedToId, deadline.',
          400
        );
        return;
      }

      // Verify assignee exists
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
        include: { department: true },
      });
      if (!assignee) {
        sendError(res, 'Assigned member not found.', 404);
        return;
      }

      // Resolve effective departmentId
      const targetDeptId = departmentId || assignee.departmentId;

      // RBAC enforcement on task creation
      if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (targetDeptId !== user.departmentId || assignee.departmentId !== user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only create tasks for their assigned department.',
            403
          );
          return;
        }
      } else if (user.role !== UserRole.ADMIN) {
        sendError(res, 'Forbidden: Regular members cannot assign tasks.', 403);
        return;
      }

      const parsedCredits = creditValue ? parseInt(creditValue, 10) : 20;

      const [task] = await prisma.$transaction([
        prisma.clubTask.create({
          data: {
            title: title.trim(),
            description: (description || '').trim(),
            assignedToId,
            departmentId: targetDeptId,
            deadline: deadline.trim(),
            priority: mapTaskPriority(priority),
            creditValue: isNaN(parsedCredits) || parsedCredits < 0 ? 20 : parsedCredits,
          },
          include: {
            assignedTo: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        }),
        prisma.activityLog.create({
          data: {
            actorId: user.userId,
            actorName: user.name || 'Administrator',
            actorRole: user.role === UserRole.ADMIN ? 'Admin' : 'Department Head',
            action: 'Assigned new task to',
            target: `${assignee.name} (${title.trim()})`,
            category: ActivityCategory.TASK,
          },
        }),
      ]);

      sendSuccess(res, formatTaskResponse(task), 'Task created successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update task status with ownership validation, state-transition verification, and atomic credit award
   */
  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;

      if (!user) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const targetStatus = mapTaskStatus(status);
      if (!targetStatus) {
        sendError(
          res,
          'Invalid status. Allowed values: TO_DO, IN_PROGRESS, UNDER_REVIEW, COMPLETED.',
          400
        );
        return;
      }

      const existing = await prisma.clubTask.findUnique({
        where: { id },
        include: { assignedTo: true, department: true },
      });

      if (!existing) {
        sendError(res, 'Task not found.', 404);
        return;
      }

      // Authorization policy:
      // - Admin: Can manage all tasks.
      // - Department Head: Can manage tasks belonging to their own department.
      // - Member: Can update only tasks assigned to their own user ID.
      if (user.role === UserRole.MEMBER) {
        if (existing.assignedToId !== user.userId) {
          sendError(
            res,
            'Forbidden: Members can only update tasks assigned to their own user ID.',
            403
          );
          return;
        }
      } else if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (existing.departmentId !== user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only manage tasks within their assigned department.',
            403
          );
          return;
        }
      }

      // If status is not changing, return early safely
      if (existing.status === targetStatus) {
        sendSuccess(res, formatTaskResponse(existing), 'Task status unchanged.');
        return;
      }

      const wasCompleted = existing.status === TaskStatus.COMPLETED;
      const isNowCompleted = targetStatus === TaskStatus.COMPLETED;

      // Atomic execution: update status and award credits if newly completed
      let updatedTask;
      if (!wasCompleted && isNowCompleted && existing.creditValue > 0) {
        const [task] = await prisma.$transaction([
          prisma.clubTask.update({
            where: { id },
            data: { status: targetStatus },
            include: { assignedTo: true, department: true },
          }),
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
              issuedBy: user.name || 'System Automation',
              issuerId: user.userId,
            },
          }),
          prisma.activityLog.create({
            data: {
              actorId: user.userId,
              actorName: user.name || 'Administrator',
              actorRole: user.role === UserRole.ADMIN ? 'Admin' : user.role === UserRole.DEPARTMENT_HEAD ? 'Department Head' : 'Member',
              action: `Completed task deliverable`,
              target: `${existing.title} (+${existing.creditValue} cr to ${existing.assignedTo.name})`,
              category: ActivityCategory.TASK,
            },
          }),
        ]);
        updatedTask = task;
      } else {
        const [task] = await prisma.$transaction([
          prisma.clubTask.update({
            where: { id },
            data: { status: targetStatus },
            include: { assignedTo: true, department: true },
          }),
          prisma.activityLog.create({
            data: {
              actorId: user.userId,
              actorName: user.name || 'Administrator',
              actorRole: user.role === UserRole.ADMIN ? 'Admin' : user.role === UserRole.DEPARTMENT_HEAD ? 'Department Head' : 'Member',
              action: `Updated task status to ${formatTaskStatus(targetStatus)}`,
              target: `${existing.title} (${existing.assignedTo.name})`,
              category: ActivityCategory.TASK,
            },
          }),
        ]);
        updatedTask = task;
      }

      sendSuccess(res, formatTaskResponse(updatedTask), `Task status updated to ${formatTaskStatus(targetStatus)}.`);
    } catch (err) {
      next(err);
    }
  }
}
