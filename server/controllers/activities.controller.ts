import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { ActivityCategory } from '@prisma/client';

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
   * List recent activity logs
   */
  static async listActivities(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = '20', category } = req.query;

      const where: any = {};
      if (category && typeof category === 'string' && category !== 'All') {
        where.category = category as ActivityCategory;
      }

      const logs = await prisma.activityLog.findMany({
        where,
        take: parseInt(limit as string, 10),
        orderBy: { createdAt: 'desc' },
      });

      sendSuccess(res, logs);
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
      const { action, target, category } = req.body;

      if (!action || !target || !category) {
        sendError(res, 'Required fields: action, target, category.', 400);
        return;
      }

      const actorName = req.user?.name || 'Administrator';
      const actorRole = req.user?.role || 'Admin';

      const entry = await prisma.activityLog.create({
        data: {
          actorName,
          actorRole,
          action,
          target,
          category: category as ActivityCategory,
        },
      });

      sendSuccess(res, entry, 'Activity logged.', 201);
    } catch (err) {
      next(err);
    }
  }
}

