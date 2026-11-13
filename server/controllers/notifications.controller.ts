import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { NotificationType } from '@prisma/client';

function mapNotificationType(type?: string): NotificationType | undefined {
  if (!type || type === 'ALL' || type === 'All') return undefined;
  const upper = type.trim().toUpperCase();
  if (Object.values(NotificationType).includes(upper as NotificationType)) {
    return upper as NotificationType;
  }
  return undefined;
}

function formatNotification(n: any) {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    relatedEntityId: n.relatedEntityId,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    readAt: n.readAt instanceof Date ? n.readAt.toISOString() : n.readAt,
  };
}

export class NotificationsController {
  /**
   * Diagnostic status of notifications module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'notifications',
      status: 'active',
      endpoints: [
        'GET /api/notifications',
        'GET /api/notifications/unread-count',
        'PATCH /api/notifications/:id/read',
        'PATCH /api/notifications/read-all',
        'DELETE /api/notifications/:id',
      ],
    });
  }

  /**
   * List notifications for currently authenticated user
   */
  static async listNotifications(
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

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
      const typeFilter = mapNotificationType(req.query.type as string);

      const where: any = {
        userId: user.userId,
      };

      if (unreadOnly || req.query.isRead === 'false') {
        where.isRead = false;
      } else if (req.query.isRead === 'true') {
        where.isRead = true;
      }

      if (typeFilter) {
        where.type = typeFilter;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId: user.userId, isRead: false },
        }),
      ]);

      sendSuccess(res, {
        notifications: notifications.map(formatNotification),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        unreadCount,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lightweight endpoint to retrieve unread notification count
   */
  static async getUnreadCount(
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

      const unreadCount = await prisma.notification.count({
        where: {
          userId: user.userId,
          isRead: false,
        },
      });

      sendSuccess(res, { unreadCount });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark a single notification as read (strictly scoped to owner)
   */
  static async markAsRead(
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

      const { id } = req.params;

      const existing = await prisma.notification.findUnique({
        where: { id },
      });

      if (!existing) {
        sendError(res, 'Notification not found.', 404);
        return;
      }

      if (existing.userId !== user.userId) {
        sendError(res, 'Forbidden: You cannot modify notifications belonging to another user.', 403);
        return;
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      sendSuccess(res, formatNotification(updated), 'Notification marked as read.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark all notifications belonging to the authenticated user as read
   */
  static async markAllAsRead(
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

      const result = await prisma.notification.updateMany({
        where: {
          userId: user.userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      sendSuccess(res, { updatedCount: result.count, count: result.count }, 'All notifications marked as read.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a notification belonging to the authenticated user
   */
  static async deleteNotification(
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

      const { id } = req.params;

      const existing = await prisma.notification.findUnique({
        where: { id },
      });

      if (!existing) {
        sendError(res, 'Notification not found.', 404);
        return;
      }

      if (existing.userId !== user.userId) {
        sendError(res, 'Forbidden: You cannot delete notifications belonging to another user.', 403);
        return;
      }

      await prisma.notification.delete({
        where: { id },
      });

      sendSuccess(res, { id }, 'Notification deleted successfully.');
    } catch (err) {
      next(err);
    }
  }
}
