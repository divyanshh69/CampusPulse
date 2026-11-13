import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { RegistrationStatus, ActivityCategory, EventStatus, UserRole } from '@prisma/client';

export class RegistrationsController {
  /**
   * Diagnostic status of registrations module
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
   * Enforces:
   * 1. Event existence
   * 2. Non-cancelled event status
   * 3. Duplicate registration prevention (409 Conflict)
   * 4. Capacity limit enforcement (400 Bad Request)
   * 5. Atomic transaction execution
   * 6. Activity log generation
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

      const event = await prisma.clubEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        sendError(res, 'Event not found.', 404);
        return;
      }

      if (event.status === EventStatus.CANCELLED) {
        sendError(res, 'Cannot register for a cancelled event.', 400);
        return;
      }

      const userId = user.userId;

      // Atomic registration and capacity check
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check existing registration
        const existing = await tx.eventRegistration.findUnique({
          where: {
            eventId_userId: { eventId, userId },
          },
        });

        if (existing && existing.status === RegistrationStatus.REGISTERED) {
          throw { status: 409, message: 'You are already registered for this event.' };
        }

        // 2. Check event capacity
        if (event.capacity && event.capacity > 0) {
          const activeCount = await tx.eventRegistration.count({
            where: {
              eventId,
              status: RegistrationStatus.REGISTERED,
            },
          });

          if (activeCount >= event.capacity) {
            throw {
              status: 400,
              message: `This event has reached full capacity (${event.capacity} maximum participants).`,
            };
          }
        }

        // 3. Upsert registration
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

        // 4. Record activity log
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
            target: event.title,
            category: ActivityCategory.EVENT,
          },
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

      const event = await prisma.clubEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        sendError(res, 'Event not found.', 404);
        return;
      }

      const userId = user.userId;

      // Find existing active registration
      const existing = await prisma.eventRegistration.findUnique({
        where: {
          eventId_userId: { eventId, userId },
        },
      });

      if (!existing || existing.status !== RegistrationStatus.REGISTERED) {
        sendError(res, 'You do not have an active registration for this event.', 400);
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
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
            target: event.title,
            category: ActivityCategory.EVENT,
          },
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
    } catch (err) {
      next(err);
    }
  }
}

