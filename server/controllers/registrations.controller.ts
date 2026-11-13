import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { RegistrationStatus, ActivityCategory, EventStatus, UserRole, NotificationType } from '@prisma/client';
import { NotificationService } from '../services/notification.service';

/**
 * Determines whether an event is in the past
 */
function isEventInPast(event: { date: string; status: EventStatus }): boolean {
  if (event.status === EventStatus.COMPLETED) {
    return true;
  }
  if (event.date) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      if (event.date < todayStr) {
        return true;
      }
    } catch {
      // Fallback to false on unparseable date
    }
  }
  return false;
}

export class RegistrationsController {
  /**
   * Diagnostic status of registrations module
   * Exposes only high-level route metadata with no sensitive operational or database data
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'registrations',
      status: 'active',
      endpoints: [
        'GET /api/events/my-registrations',
        'GET /api/events/:eventId/registrations',
        'POST /api/events/:eventId/register',
        'DELETE /api/events/:eventId/register',
      ],
    });
  }

  /**
   * Get registrations for the currently authenticated user
   */
  static async getMyRegistrations(
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

      const registrations = await prisma.eventRegistration.findMany({
        where: {
          userId: user.userId,
          status: RegistrationStatus.REGISTERED,
        },
        include: {
          event: {
            include: {
              department: { select: { id: true, name: true } },
              _count: {
                select: {
                  registrations: { where: { status: RegistrationStatus.REGISTERED } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = registrations.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        userId: r.userId,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        event: {
          id: r.event.id,
          title: r.event.title,
          description: r.event.description,
          date: r.event.date,
          time: r.event.time,
          location: r.event.location,
          departmentId: r.event.departmentId,
          department: r.event.department?.name || 'All Departments',
          status: r.event.status,
          capacity: r.event.capacity,
          creditReward: r.event.creditReward,
          mandatory: r.event.mandatory,
          participantCount: r.event._count?.registrations ?? 0,
        },
      }));

      sendSuccess(res, formatted);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all registered participants for a specific event
   * - Admin: Allowed for any event
   * - Department Head: Allowed only for events in their department (or club-wide events)
   * - Member: Forbidden
   */
  static async getEventRegistrations(
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

      const { eventId } = req.params;

      const event = await prisma.clubEvent.findUnique({
        where: { id: eventId },
        include: { department: true },
      });

      if (!event) {
        sendError(res, 'Event not found.', 404);
        return;
      }

      // Authorization policy
      if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (event.departmentId && event.departmentId !== user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only view registrations for events in their own department.',
            403
          );
          return;
        }
      } else if (user.role !== UserRole.ADMIN) {
        sendError(
          res,
          'Forbidden: Regular members cannot access participant lists.',
          403
        );
        return;
      }

      const registrations = await prisma.eventRegistration.findMany({
        where: {
          eventId,
          status: RegistrationStatus.REGISTERED,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              academicYear: true,
              major: true,
              role: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const formatted = registrations.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        userId: r.userId,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        user: {
          id: r.user.id,
          name: r.user.name,
          email: r.user.email,
          studentId: r.user.studentId,
          academicYear: r.user.academicYear,
          major: r.user.major,
          role: r.user.role,
          department: r.user.department?.name || 'General',
        },
      }));

      sendSuccess(res, {
        event: {
          id: event.id,
          title: event.title,
          capacity: event.capacity,
          department: event.department?.name || 'All Departments',
        },
        registrations: formatted,
        count: formatted.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Register the currently authenticated member for an event
   * Concurrency-safe implementation:
   * 1. Acquires an exclusive row-level lock on the ClubEvent row (SELECT ... FOR UPDATE)
   * 2. Validates event existence, cancelled status, and completed/past event timing
   * 3. Prevents duplicate active registration (409 Conflict)
   * 4. Enforces capacity limit with 100% isolation against race conditions (400 Bad Request)
   * 5. Safely reactivates previously cancelled registrations via atomic upsert
   * 6. Creates activity log inside the same transaction
   */
  static async registerForEvent(
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

      const { eventId } = req.params;
      const userId = user.userId;

      // Execute concurrency-safe registration inside transaction with row-level lock
      const result = await prisma.$transaction(async (tx) => {
        // 1. Lock the target event row with SELECT ... FOR UPDATE
        // This serializes all concurrent registration requests for this specific event
        const lockedEvents = await tx.$queryRaw<
          Array<{
            id: string;
            title: string;
            status: EventStatus;
            capacity: number;
            date: string;
            time: string;
          }>
        >`
          SELECT id, title, status, capacity, date, time
          FROM "club_events"
          WHERE id = ${eventId}
          FOR UPDATE
        `;

        if (!lockedEvents || lockedEvents.length === 0) {
          throw { status: 404, message: 'Event not found.' };
        }

        const lockedEvent = lockedEvents[0];

        // 2. Validate event status & timing
        if (lockedEvent.status === EventStatus.CANCELLED) {
          throw { status: 400, message: 'Cannot register for a cancelled event.' };
        }

        if (isEventInPast(lockedEvent)) {
          throw { status: 400, message: 'Cannot register for a past or completed event.' };
        }

        // 3. Check existing registration for this user
        const existing = await tx.eventRegistration.findUnique({
          where: {
            eventId_userId: { eventId, userId },
          },
        });

        if (existing && existing.status === RegistrationStatus.REGISTERED) {
          throw { status: 409, message: 'You are already registered for this event.' };
        }

        // 4. Enforce capacity limit atomically while holding row lock
        if (lockedEvent.capacity && lockedEvent.capacity > 0) {
          const activeCount = await tx.eventRegistration.count({
            where: {
              eventId,
              status: RegistrationStatus.REGISTERED,
            },
          });

          if (activeCount >= lockedEvent.capacity) {
            throw {
              status: 400,
              message: `This event has reached full capacity (${lockedEvent.capacity} maximum participants).`,
            };
          }
        }

        // 5. Upsert registration (reactivates CANCELLED row or inserts new REGISTERED row)
        const registration = await tx.eventRegistration.upsert({
          where: {
            eventId_userId: { eventId, userId },
          },
          update: {
            status: RegistrationStatus.REGISTERED,
            updatedAt: new Date(),
          },
          create: {
            eventId,
            userId,
            status: RegistrationStatus.REGISTERED,
          },
        });

        // 6. Record activity log atomically
        const actorRole =
          user.role === UserRole.ADMIN
            ? 'Admin'
            : user.role === UserRole.DEPARTMENT_HEAD
            ? 'Department Head'
            : 'Member';

        await tx.activityLog.create({
          data: {
            actorId: user.userId,
            actorName: user.name || 'Member',
            actorRole,
            action: 'Registered for event',
            target: lockedEvent.title,
            category: ActivityCategory.EVENT,
          },
        });

        // Record in-app notification atomically
        await NotificationService.notifyUser(tx, {
          userId: user.userId,
          title: 'RSVP Confirmed',
          message: `You are registered for "${lockedEvent.title}".`,
          type: NotificationType.REGISTRATION,
          relatedEntityId: eventId,
        });

        return registration;
      });

      sendSuccess(
        res,
        {
          id: result.id,
          eventId: result.eventId,
          userId: result.userId,
          status: result.status,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        },
        'Successfully registered for event.',
        201
      );
    } catch (err: any) {
      if (err.status && err.message) {
        sendError(res, err.message, err.status);
        return;
      }
      next(err);
    }
  }

  /**
   * Cancel the currently authenticated member's registration for an event
   * Concurrency-safe and transactionally consistent implementation
   */
  static async cancelRegistration(
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

      const { eventId } = req.params;
      const userId = user.userId;

      const result = await prisma.$transaction(async (tx) => {
        // Lock event row
        const lockedEvents = await tx.$queryRaw<
          Array<{ id: string; title: string }>
        >`
          SELECT id, title
          FROM "club_events"
          WHERE id = ${eventId}
          FOR UPDATE
        `;

        if (!lockedEvents || lockedEvents.length === 0) {
          throw { status: 404, message: 'Event not found.' };
        }

        const lockedEvent = lockedEvents[0];

        // Find existing active registration
        const existing = await tx.eventRegistration.findUnique({
          where: {
            eventId_userId: { eventId, userId },
          },
        });

        if (!existing || existing.status !== RegistrationStatus.REGISTERED) {
          throw {
            status: 400,
            message: 'You do not have an active registration for this event.',
          };
        }

        // Cancel registration
        const cancelled = await tx.eventRegistration.update({
          where: {
            eventId_userId: { eventId, userId },
          },
          data: {
            status: RegistrationStatus.CANCELLED,
            updatedAt: new Date(),
          },
        });

        const actorRole =
          user.role === UserRole.ADMIN
            ? 'Admin'
            : user.role === UserRole.DEPARTMENT_HEAD
            ? 'Department Head'
            : 'Member';

        await tx.activityLog.create({
          data: {
            actorId: user.userId,
            actorName: user.name || 'Member',
            actorRole,
            action: 'Cancelled event registration',
            target: lockedEvent.title,
            category: ActivityCategory.EVENT,
          },
        });

        // Record in-app notification atomically
        await NotificationService.notifyUser(tx, {
          userId: user.userId,
          title: 'RSVP Cancelled',
          message: `Your registration for "${lockedEvent.title}" has been cancelled.`,
          type: NotificationType.REGISTRATION,
          relatedEntityId: eventId,
        });

        return cancelled;
      });

      sendSuccess(
        res,
        {
          id: result.id,
          eventId: result.eventId,
          userId: result.userId,
          status: result.status,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        },
        'Event registration successfully cancelled.'
      );
    } catch (err: any) {
      if (err.status && err.message) {
        sendError(res, err.message, err.status);
        return;
      }
      next(err);
    }
  }
}
