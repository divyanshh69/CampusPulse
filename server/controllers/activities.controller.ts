import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { ActivityCategory, UserRole } from '@prisma/client';

function mapActivityCategory(input: any): ActivityCategory {
  if (!input) return ActivityCategory.EVENT;
  const str = String(input).trim().toUpperCase();
  if (str === 'MEMBER') return ActivityCategory.MEMBER;
  if (str === 'ATTENDANCE') return ActivityCategory.ATTENDANCE;
  if (str === 'CREDIT') return ActivityCategory.CREDIT;
  if (str === 'TASK') return ActivityCategory.TASK;
  return ActivityCategory.EVENT;
}

function formatActivityCategory(cat: ActivityCategory): 'member' | 'event' | 'attendance' | 'credit' | 'task' {
  switch (cat) {
    case ActivityCategory.MEMBER:
      return 'member';
    case ActivityCategory.ATTENDANCE:
      return 'attendance';
    case ActivityCategory.CREDIT:
      return 'credit';
    case ActivityCategory.TASK:
      return 'task';
    case ActivityCategory.EVENT:
    default:
      return 'event';
  }
}

function formatActivityTimestamp(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toISOString().slice(0, 10);
}

function formatActivityResponse(log: any) {
  const ts = log.createdAt || log.timestamp || new Date();
  const dateObj = ts instanceof Date ? ts : new Date(ts);
  return {
    id: log.id,
    actorName: log.actorName,
    actorRole: log.actorRole,
    action: log.action,
    target: log.target,
    category: formatActivityCategory(log.category),
    timestamp: formatActivityTimestamp(dateObj),
    createdAt: dateObj.toISOString(),
  };
}

export class ActivitiesController {
  /**
   * Diagnostic status of activities module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'activities',
      status: 'initialized',
      endpoints: ['GET /api/activities', 'POST /api/activities'],
    });
  }

  /**
   * List recent activity logs with role-based visibility
   */
  static async listActivities(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, 'Authentication required to view activity logs.', 401);
        return;
      }

      const { limit = '30', category } = req.query;

      const where: any = {};
      if (category && typeof category === 'string' && category !== 'All') {
        where.category = mapActivityCategory(category);
      }

      // Role-based visibility enforcement
      if (user.role === UserRole.MEMBER) {
        // Members see general event/announcement activities and their own activities
        where.OR = [
          { category: ActivityCategory.EVENT },
          { actorId: user.userId },
          { target: { contains: user.name || user.email, mode: 'insensitive' } },
        ];
      }

      const logs = await prisma.activityLog.findMany({
        where,
        take: parseInt(limit as string, 10),
        orderBy: { createdAt: 'desc' },
      });

      sendSuccess(res, logs.map(formatActivityResponse));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Record new activity log
   */
  static async recordActivity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, 'Authentication required to log activities.', 401);
        return;
      }

      const { action, target, category } = req.body;

      if (!action || !target || !category) {
        sendError(res, 'Required fields: action, target, category.', 400);
        return;
      }

      const actorName = user.name || 'Administrator';
      const actorRole =
        user.role === UserRole.ADMIN
          ? 'Admin'
          : user.role === UserRole.DEPARTMENT_HEAD
          ? 'Department Head'
          : 'Member';

      const entry = await prisma.activityLog.create({
        data: {
          actorId: user.userId,
          actorName,
          actorRole,
          action: String(action).trim(),
          target: String(target).trim(),
          category: mapActivityCategory(category),
        },
      });

      sendSuccess(res, formatActivityResponse(entry), 'Activity logged.', 201);
    } catch (err) {
      next(err);
    }
  }
}
