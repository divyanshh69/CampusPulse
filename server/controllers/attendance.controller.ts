import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceController {
  /**
   * Diagnostic status of attendance module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'attendance',
      status: 'initialized',
      endpoints: [
        'GET /api/attendance/event/:eventId',
        'GET /api/attendance/member/:memberId',
        'POST /api/attendance/mark',
        'POST /api/attendance/mark-all-present',
      ],
    });
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
      const { eventId } = req.params;

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

      sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark attendance for a single member
   */
  static async markAttendance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { eventId, memberId, status, note } = req.body;

      if (!eventId || !memberId || !status) {
        sendError(res, 'Required fields: eventId, memberId, status.', 400);
        return;
      }

      const markedBy = req.user?.name || 'Administrator';

      const record = await prisma.attendanceRecord.upsert({
        where: {
          eventId_memberId: { eventId, memberId },
        },
        update: {
          status: status as AttendanceStatus,
          markedBy,
          note,
          markedAt: new Date(),
        },
        create: {
          eventId,
          memberId,
          status: status as AttendanceStatus,
          markedBy,
          note,
        },
      });

      sendSuccess(res, record, 'Attendance updated.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark all members present for an event
   */
  static async markAllPresent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { eventId } = req.body;

      if (!eventId) {
        sendError(res, 'Required field: eventId.', 400);
        return;
      }

      const members = await prisma.user.findMany({ select: { id: true } });
      const markedBy = req.user?.name || 'Administrator';

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
      }

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

