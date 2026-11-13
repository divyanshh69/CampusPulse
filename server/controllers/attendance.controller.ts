import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AttendanceStatus, ActivityCategory, UserRole, NotificationType } from '@prisma/client';
import { NotificationService } from '../services/notification.service';

function mapAttendanceStatus(input: any): AttendanceStatus | null {
  if (!input) return null;
  const str = String(input).trim().toUpperCase();
  if (str === 'PRESENT') return AttendanceStatus.PRESENT;
  if (str === 'EXCUSED') return AttendanceStatus.EXCUSED;
  if (str === 'ABSENT') return AttendanceStatus.ABSENT;
  return null;
}

function formatAttendanceStatus(status: AttendanceStatus): 'Present' | 'Excused' | 'Absent' {
  switch (status) {
    case AttendanceStatus.EXCUSED:
      return 'Excused';
    case AttendanceStatus.ABSENT:
      return 'Absent';
    case AttendanceStatus.PRESENT:
    default:
      return 'Present';
  }
}

function formatAttendanceRecord(r: any) {
  return {
    id: r.id,
    eventId: r.eventId,
    memberId: r.memberId,
    status: formatAttendanceStatus(r.status),
    markedAt:
      r.markedAt instanceof Date
        ? r.markedAt.toISOString().slice(0, 16).replace('T', ' ')
        : String(r.markedAt),
    markedBy: r.markedBy,
    note: r.note || undefined,
  };
}

async function recalculateUserAttendance(memberId: string): Promise<number> {
  const records = await prisma.attendanceRecord.findMany({
    where: { memberId },
    select: { status: true },
  });
  if (records.length === 0) return 100.0;
  const attendedCount = records.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.EXCUSED
  ).length;
  const percentage = Math.round((attendedCount / records.length) * 1000) / 10;
  await prisma.user.update({
    where: { id: memberId },
    data: { attendancePercentage: percentage },
  });
  return percentage;
}

export class AttendanceController {
  /**
   * Diagnostic status of attendance module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'attendance',
      status: 'initialized',
      endpoints: [
        'GET /api/attendance',
        'GET /api/attendance/event/:eventId',
        'POST /api/attendance/mark',
        'POST /api/attendance/mark-all-present',
      ],
    });
  }

  /**
   * List attendance records with role-based visibility scoping
   */
  static async listAttendance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, 'Authentication required to view attendance.', 401);
        return;
      }

      const { eventId, memberId } = req.query;
      const where: any = {};

      if (eventId && typeof eventId === 'string') {
        where.eventId = eventId;
      }

      if (user.role === UserRole.MEMBER) {
        where.memberId = user.userId;
      } else if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (memberId && typeof memberId === 'string') {
          where.memberId = memberId;
          where.member = { departmentId: user.departmentId };
        } else {
          where.OR = [
            { event: { departmentId: user.departmentId } },
            { event: { departmentId: null } },
            { member: { departmentId: user.departmentId } },
          ];
        }
      } else if (user.role === UserRole.ADMIN) {
        if (memberId && typeof memberId === 'string') {
          where.memberId = memberId;
        }
      }

      const records = await prisma.attendanceRecord.findMany({
        where,
        orderBy: { markedAt: 'desc' },
      });

      sendSuccess(res, records.map(formatAttendanceRecord));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get attendance roster for a specific event
   */
  static async getEventAttendance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, 'Authentication required to view attendance roster.', 401);
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

      // Department Heads may only view rosters for their department or club-wide events
      if (
        user.role === UserRole.DEPARTMENT_HEAD &&
        event.departmentId &&
        event.departmentId !== user.departmentId
      ) {
        sendError(
          res,
          'Forbidden: You only have access to view attendance for events in your department.',
          403
        );
        return;
      }

      const records = await prisma.attendanceRecord.findMany({
        where: { eventId },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              departmentId: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { markedAt: 'asc' },
      });

      sendSuccess(res, records.map(formatAttendanceRecord));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark attendance for a single member with RBAC and department scoping
   */
  static async markAttendance(
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

      const { eventId, memberId, status, note } = req.body;

      if (!eventId || !memberId || !status) {
        sendError(res, 'Required fields: eventId, memberId, status.', 400);
        return;
      }

      const mappedStatus = mapAttendanceStatus(status);
      if (!mappedStatus) {
        sendError(res, 'Invalid attendance status. Allowed values: Present, Excused, Absent.', 400);
        return;
      }

      // Verify event exists and check department ownership
      const event = await prisma.clubEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        sendError(res, 'Event not found.', 404);
        return;
      }

      // Authorization policy:
      // - Admin: Can manage attendance for all events.
      // - Department Head: Can manage attendance only for events in their department.
      // - Member: Forbidden.
      if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (event.departmentId !== user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only manage attendance for events belonging to their assigned department.',
            403
          );
          return;
        }
      } else if (user.role !== UserRole.ADMIN) {
        sendError(res, 'Forbidden: Regular members cannot record attendance.', 403);
        return;
      }

      // Verify member exists
      const member = await prisma.user.findUnique({
        where: { id: memberId },
      });

      if (!member) {
        sendError(res, 'Member not found.', 404);
        return;
      }

      const markedBy = user.name || 'Administrator';

      const record = await prisma.attendanceRecord.upsert({
        where: {
          eventId_memberId: { eventId, memberId },
        },
        update: {
          status: mappedStatus,
          markedBy,
          note: note ? String(note).trim() : null,
          markedAt: new Date(),
        },
        create: {
          eventId,
          memberId,
          status: mappedStatus,
          markedBy,
          note: note ? String(note).trim() : null,
        },
      });

      // Recalculate member attendance percentage in database
      const newPercentage = await recalculateUserAttendance(memberId);

      // Record activity log
      await prisma.activityLog.create({
        data: {
          actorId: user.userId,
          actorName: user.name || 'Administrator',
          actorRole: user.role === UserRole.ADMIN ? 'Admin' : user.role === UserRole.DEPARTMENT_HEAD ? 'Department Head' : 'Member',
          action: `Marked ${formatAttendanceStatus(mappedStatus).toLowerCase()} for`,
          target: `${member.name} · ${event.title}`,
          category: ActivityCategory.ATTENDANCE,
        },
      });

      // Dispatch in-app notification to member
      try {
        await NotificationService.notifyUser(prisma, {
          userId: memberId,
          title: 'Attendance Recorded',
          message: `Your attendance for "${event.title}" was marked as ${formatAttendanceStatus(mappedStatus)}.`,
          type: NotificationType.ATTENDANCE,
          relatedEntityId: event.id,
        });
      } catch (notifErr) {
        console.error('Failed to dispatch attendance notification:', notifErr);
      }

      sendSuccess(res, { ...formatAttendanceRecord(record), attendancePercentage: newPercentage }, 'Attendance updated.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark all members present for an event with RBAC and department scoping
   */
  static async markAllPresent(
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

      const { eventId } = req.body;

      if (!eventId) {
        sendError(res, 'Required field: eventId.', 400);
        return;
      }

      const event = await prisma.clubEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        sendError(res, 'Event not found.', 404);
        return;
      }

      // Authorization policy:
      // - Admin: Can manage all events.
      // - Department Head: Can manage attendance only for events in their department.
      if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (event.departmentId !== user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only manage attendance for events belonging to their assigned department.',
            403
          );
          return;
        }
      } else if (user.role !== UserRole.ADMIN) {
        sendError(res, 'Forbidden: Regular members cannot record bulk attendance.', 403);
        return;
      }

      // If event is scoped to a department, mark department members; otherwise mark all active members
      const memberWhere = event.departmentId ? { departmentId: event.departmentId } : {};
      const members = await prisma.user.findMany({
        where: memberWhere,
        select: { id: true },
      });

      const markedBy = user.name || 'Administrator';

      const results = [];
      for (const m of members) {
        const rec = await prisma.attendanceRecord.upsert({
          where: { eventId_memberId: { eventId, memberId: m.id } },
          update: {
            status: AttendanceStatus.PRESENT,
            markedBy,
            markedAt: new Date(),
          },
          create: {
            eventId,
            memberId: m.id,
            status: AttendanceStatus.PRESENT,
            markedBy,
          },
        });
        results.push(rec);
        await recalculateUserAttendance(m.id);
      }

      // Record activity log
      await prisma.activityLog.create({
        data: {
          actorId: user.userId,
          actorName: user.name || 'Administrator',
          actorRole: user.role === UserRole.ADMIN ? 'Admin' : user.role === UserRole.DEPARTMENT_HEAD ? 'Department Head' : 'Member',
          action: 'Marked full roster Present for',
          target: event.title,
          category: ActivityCategory.ATTENDANCE,
        },
      });

      sendSuccess(
        res,
        { updatedCount: results.length },
        'Marked all members present.'
      );
    } catch (err) {
      next(err);
    }
  }
}
