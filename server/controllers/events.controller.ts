import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { EventStatus, UserRole } from '@prisma/client';

/**
 * Maps frontend or case-insensitive status string to Prisma EventStatus enum
 */
function mapEventStatus(status?: string): EventStatus {
  if (!status) return EventStatus.UPCOMING;
  const upper = status.trim().toUpperCase();
  if (upper === 'ONGOING') return EventStatus.ONGOING;
  if (upper === 'COMPLETED') return EventStatus.COMPLETED;
  if (upper === 'CANCELLED' || upper === 'CANCELED') return EventStatus.CANCELLED;
  return EventStatus.UPCOMING;
}

/**
 * Formats Prisma EventStatus enum to frontend-standard title-cased status string
 */
function formatEventStatus(status: EventStatus): 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' {
  switch (status) {
    case EventStatus.ONGOING:
      return 'Ongoing';
    case EventStatus.COMPLETED:
      return 'Completed';
    case EventStatus.CANCELLED:
      return 'Cancelled';
    case EventStatus.UPCOMING:
    default:
      return 'Upcoming';
  }
}

/**
 * Resolves departmentId from either an ID ('dept-tech') or name ('Technical & Engineering').
 * Returns null if 'All Departments', null, or empty.
 */
async function resolveDepartmentId(deptInput?: string | null): Promise<string | null> {
  if (!deptInput || deptInput === 'All Departments' || deptInput.toLowerCase() === 'all') {
    return null;
  }
  const dept = await prisma.department.findFirst({
    where: {
      OR: [
        { id: deptInput },
        { name: deptInput },
        { code: deptInput.toUpperCase() },
      ],
    },
  });
  return dept ? dept.id : null;
}

/**
 * Formats event record for consistent frontend consumption
 */
function formatEvent(e: any) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date,
    time: e.time,
    location: e.location,
    departmentId: e.departmentId,
    department: e.department?.name || 'All Departments',
    status: formatEventStatus(e.status),
    capacity: e.capacity,
    creditReward: e.creditReward,
    mandatory: Boolean(e.mandatory),
    participantCount: e._count?.attendanceRecords ?? (e.attendanceRecords ? e.attendanceRecords.length : 0),
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export class EventsController {
  /**
   * Diagnostic status of events module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'events',
      status: 'active',
      endpoints: [
        'GET /api/events',
        'GET /api/events/:id',
        'POST /api/events',
        'PATCH /api/events/:id',
        'DELETE /api/events/:id',
      ],
    });
  }

  /**
   * List events with optional status and department filters
   */
  static async listEvents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status, departmentId, department, search } = req.query;

      const where: any = {};

      if (status && typeof status === 'string' && status !== 'All') {
        where.status = mapEventStatus(status);
      }

      const rawDept = (departmentId || department) as string | undefined;
      if (rawDept && rawDept !== 'All' && rawDept !== 'All Departments') {
        const resolvedId = await resolveDepartmentId(rawDept);
        if (resolvedId) {
          where.departmentId = resolvedId;
        }
      }

      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim();
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }

      const events = await prisma.clubEvent.findMany({
        where,
        include: {
          department: true,
          _count: {
            select: { attendanceRecords: true },
          },
        },
        orderBy: { date: 'asc' },
      });

      sendSuccess(res, events.map(formatEvent));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single event with attendance stats
   */
  static async getEventById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const event = await prisma.clubEvent.findUnique({
        where: { id },
        include: {
          department: true,
          _count: {
            select: { attendanceRecords: true },
          },
          attendanceRecords: {
            include: {
              member: {
                select: { id: true, name: true, email: true, departmentId: true, studentId: true },
              },
            },
            orderBy: { markedAt: 'desc' },
          },
        },
      });

      if (!event) {
        sendError(res, 'Event not found.', 404);
        return;
      }

      sendSuccess(res, {
        ...formatEvent(event),
        attendanceRecords: event.attendanceRecords,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create new event with RBAC enforcement
   * - Admin: Can create events for any department or All Departments
   * - Department Head: Can only create events for their own department
   * - Member: Forbidden (handled by route middleware)
   */
  static async createEvent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        title,
        description,
        date,
        time,
        location,
        departmentId,
        department,
        status,
        capacity,
        creditReward,
        mandatory,
      } = req.body;

      if (!title || !date || !location) {
        sendError(res, 'Required fields: title, date, location.', 400);
        return;
      }

      const user = req.user;
      if (!user) {
        sendError(res, 'Authentication required.', 401);
        return;
      }

      const inputDept = departmentId || department;
      let targetDeptId: string | null = null;

      if (user.role === UserRole.DEPARTMENT_HEAD) {
        // Department heads are strictly scoped to their assigned department
        if (inputDept && inputDept !== 'All Departments') {
          const resolved = await resolveDepartmentId(inputDept);
          if (resolved !== user.departmentId) {
            sendError(
              res,
              'Department heads can only create events for their assigned department.',
              403
            );
            return;
          }
        } else if (inputDept === 'All Departments') {
          sendError(
            res,
            'Department heads cannot create club-wide (All Departments) events.',
            403
          );
          return;
        }
        targetDeptId = user.departmentId;
      } else if (user.role === UserRole.ADMIN) {
        // Admins can create events for any department or All Departments (null)
        if (inputDept) {
          targetDeptId = await resolveDepartmentId(inputDept);
        }
      } else {
        sendError(res, 'Unauthorized: Members cannot create events.', 403);
        return;
      }

      const parsedCapacity = Number(capacity);
      const parsedCredits = Number(creditReward);

      const event = await prisma.clubEvent.create({
        data: {
          title: title.trim(),
          description: (description || '').trim(),
          date: date.trim(),
          time: (time || '17:00 - 19:00').trim(),
          location: location.trim(),
          departmentId: targetDeptId,
          status: status ? mapEventStatus(status) : EventStatus.UPCOMING,
          capacity: isNaN(parsedCapacity) || parsedCapacity < 1 ? 60 : parsedCapacity,
          creditReward: isNaN(parsedCredits) || parsedCredits < 0 ? 20 : parsedCredits,
          mandatory: Boolean(mandatory),
        },
        include: {
          department: true,
          _count: {
            select: { attendanceRecords: true },
          },
        },
      });

      sendSuccess(res, formatEvent(event), 'Event created successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update existing event with RBAC enforcement
   * - Admin: Can update any event and change any field
   * - Department Head: Can only update events within their department, cannot reassign department
   * - Member: Forbidden
   */
  static async updateEvent(
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

      const existingEvent = await prisma.clubEvent.findUnique({
        where: { id },
        include: { department: true },
      });

      if (!existingEvent) {
        sendError(res, 'Event not found.', 404);
        return;
      }

      // RBAC Department Scoping
      if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (existingEvent.departmentId !== user.departmentId) {
          sendError(
            res,
            'Department heads can only update events within their assigned department.',
            403
          );
          return;
        }

        // Department heads cannot change event department or make it club-wide
        const reqDept = req.body.departmentId || req.body.department;
        if (reqDept !== undefined) {
          const resolved = await resolveDepartmentId(reqDept);
          if (resolved !== user.departmentId) {
            sendError(
              res,
              'Department heads cannot reassign events to another department or All Departments.',
              403
            );
            return;
          }
        }
      } else if (user.role !== UserRole.ADMIN) {
        sendError(res, 'Unauthorized: Members cannot modify events.', 403);
        return;
      }

      const updateData: any = {};
      const {
        title,
        description,
        date,
        time,
        location,
        departmentId,
        department,
        status,
        capacity,
        creditReward,
        mandatory,
      } = req.body;

      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (date !== undefined) updateData.date = date.trim();
      if (time !== undefined) updateData.time = time.trim();
      if (location !== undefined) updateData.location = location.trim();
      if (status !== undefined) updateData.status = mapEventStatus(status);

      if (capacity !== undefined) {
        const c = Number(capacity);
        if (!isNaN(c) && c >= 1) updateData.capacity = c;
      }

      if (creditReward !== undefined) {
        const cr = Number(creditReward);
        if (!isNaN(cr) && cr >= 0) updateData.creditReward = cr;
      }

      if (mandatory !== undefined) {
        updateData.mandatory = Boolean(mandatory);
      }

      // Department reassignment (Admin only or verified Dept Head)
      if (departmentId !== undefined || department !== undefined) {
        const deptInput = departmentId !== undefined ? departmentId : department;
        if (user.role === UserRole.ADMIN) {
          updateData.departmentId = await resolveDepartmentId(deptInput);
        }
      }

      const updated = await prisma.clubEvent.update({
        where: { id },
        data: updateData,
        include: {
          department: true,
          _count: {
            select: { attendanceRecords: true },
          },
        },
      });

      sendSuccess(res, formatEvent(updated), 'Event updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete / Cancel an event with RBAC enforcement
   * - Admin: Can delete any event
   * - Department Head: Can only delete events in their department
   * - Member: Forbidden
   */
  static async deleteEvent(
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

      const existingEvent = await prisma.clubEvent.findUnique({
        where: { id },
      });

      if (!existingEvent) {
        sendError(res, 'Event not found.', 404);
        return;
      }

      if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (existingEvent.departmentId !== user.departmentId) {
          sendError(
            res,
            'Department heads can only delete events within their assigned department.',
            403
          );
          return;
        }
      } else if (user.role !== UserRole.ADMIN) {
        sendError(res, 'Unauthorized: Members cannot delete events.', 403);
        return;
      }

      await prisma.clubEvent.delete({
        where: { id },
      });

      sendSuccess(res, { id }, 'Event deleted successfully.');
    } catch (err) {
      next(err);
    }
  }
}
