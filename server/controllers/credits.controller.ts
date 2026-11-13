import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { CreditCategory, ActivityCategory, UserRole, NotificationType } from '@prisma/client';

function mapCreditCategory(input: any): CreditCategory {
  if (!input) return CreditCategory.TASK_COMPLETION;
  const str = String(input).trim().toUpperCase().replace(/[\s\/-]/g, '_');
  if (str.includes('LEADERSHIP')) return CreditCategory.LEADERSHIP_BONUS;
  if (str.includes('PENALTY') || str.includes('DEDUCTION')) return CreditCategory.PENALTY_DEDUCTION;
  if (str.includes('PEER')) return CreditCategory.PEER_RECOGNITION;
  if (str.includes('ATTENDANCE')) return CreditCategory.EVENT_ATTENDANCE;
  if (str.includes('TASK')) return CreditCategory.TASK_COMPLETION;
  return CreditCategory.TASK_COMPLETION;
}

function formatCreditCategory(cat: CreditCategory): string {
  switch (cat) {
    case CreditCategory.LEADERSHIP_BONUS:
      return 'Leadership Bonus';
    case CreditCategory.PENALTY_DEDUCTION:
      return 'Penalty / Deduction';
    case CreditCategory.PEER_RECOGNITION:
      return 'Peer Recognition';
    case CreditCategory.EVENT_ATTENDANCE:
      return 'Event Attendance';
    case CreditCategory.TASK_COMPLETION:
    default:
      return 'Task Completion';
  }
}

export class CreditsController {
  /**
   * Diagnostic status of credits module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'credits',
      status: 'initialized',
      endpoints: [
        'GET /api/credits/transactions',
        'POST /api/credits/adjust',
      ],
    });
  }

  /**
   * List credit transactions with role-based visibility scoping
   */
  static async listTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        sendError(res, 'Authentication required to view credit ledger.', 401);
        return;
      }

      const { limit = '100', memberId } = req.query;
      const where: any = {};

      // Role-based visibility enforcement
      if (user.role === UserRole.MEMBER) {
        // Members may only see their own credit transactions
        where.memberId = user.userId;
      } else if (user.role === UserRole.DEPARTMENT_HEAD) {
        // Department heads may see transactions for members in their department
        where.member = { departmentId: user.departmentId };
        if (memberId && typeof memberId === 'string') {
          where.memberId = memberId;
        }
      } else if (user.role === UserRole.ADMIN) {
        // Admins can see all transactions or filter by member
        if (memberId && typeof memberId === 'string') {
          where.memberId = memberId;
        }
      }

      const transactions = await prisma.creditTransaction.findMany({
        where,
        take: parseInt(limit as string, 10),
        orderBy: { timestamp: 'desc' },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              department: { select: { name: true } },
            },
          },
        },
      });

      const formatted = transactions.map((t) => ({
        id: t.id,
        memberId: t.memberId,
        memberName: t.member.name,
        memberDepartment: t.member.department.name,
        delta: t.delta,
        reason: t.reason,
        category: formatCreditCategory(t.category),
        timestamp:
          t.timestamp instanceof Date
            ? t.timestamp.toISOString().slice(0, 16).replace('T', ' ')
            : String(t.timestamp),
        issuedBy: t.issuedBy,
      }));

      sendSuccess(res, formatted);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Adjust member credits (award or penalty) with RBAC and department scoping
   */
  static async adjustCredits(
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

      const { memberId, delta, reason, category } = req.body;

      if (!memberId || delta === undefined || !reason || !category) {
        sendError(
          res,
          'Required fields: memberId, delta (numeric), reason, category.',
          400
        );
        return;
      }

      const numericDelta = parseInt(delta, 10);
      if (isNaN(numericDelta) || numericDelta === 0) {
        sendError(res, 'Delta must be a non-zero integer.', 400);
        return;
      }

      if (Math.abs(numericDelta) > 1000) {
        sendError(res, 'Delta exceeds the permitted range (-1000 to +1000).', 400);
        return;
      }

      // Verify target member exists
      const targetMember = await prisma.user.findUnique({
        where: { id: memberId },
        include: { department: true },
      });

      if (!targetMember) {
        sendError(res, 'Member not found.', 404);
        return;
      }

      // Authorization policy:
      // - Admin: May adjust credits across all departments.
      // - Department Head: May adjust credits only for members belonging to their assigned department.
      //   Must not be able to award or deduct credits from themselves.
      // - Member: Forbidden.
      if (user.role === UserRole.DEPARTMENT_HEAD) {
        if (memberId === user.userId) {
          sendError(
            res,
            'Forbidden: Department Heads cannot award or deduct credits from their own account.',
            403
          );
          return;
        }

        if (targetMember.departmentId !== user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only adjust credits for members within their own department.',
            403
          );
          return;
        }

        if (targetMember.role === UserRole.ADMIN) {
          sendError(
            res,
            'Forbidden: Department Heads cannot adjust credits for Admin accounts.',
            403
          );
          return;
        }
      } else if (user.role !== UserRole.ADMIN) {
        sendError(res, 'Forbidden: Regular members cannot adjust credits.', 403);
        return;
      }

      // Prevent negative total credit balances
      if (targetMember.totalCredits + numericDelta < 0) {
        sendError(
          res,
          `Cannot deduct ${Math.abs(numericDelta)} credits. Member balance cannot fall below 0 (current balance: ${targetMember.totalCredits} cr).`,
          400
        );
        return;
      }

      const issuedBy = user.name || 'Administrator';
      const issuerId = user.userId;
      const mappedCategory = mapCreditCategory(category);

      // Atomic transaction: update member totalCredits, record transaction, and log activity
      const [updatedMember, transaction] = await prisma.$transaction([
        prisma.user.update({
          where: { id: memberId },
          data: {
            totalCredits: {
              increment: numericDelta,
            },
          },
          include: { department: true },
        }),
        prisma.creditTransaction.create({
          data: {
            memberId,
            delta: numericDelta,
            reason: reason.trim(),
            category: mappedCategory,
            issuedBy,
            issuerId,
          },
        }),
        prisma.activityLog.create({
          data: {
            actorId: user.userId,
            actorName: user.name || 'Administrator',
            actorRole: user.role === UserRole.ADMIN ? 'Admin' : 'Department Head',
            action: `Recorded ${numericDelta > 0 ? '+' : ''}${numericDelta} credits for`,
            target: `${targetMember.name} (${reason.trim()})`,
            category: ActivityCategory.CREDIT,
          },
        }),
        prisma.notification.create({
          data: {
            userId: memberId,
            title: numericDelta > 0 ? 'Credits Awarded' : 'Credits Deducted',
            message:
              numericDelta > 0
                ? `You received +${numericDelta} credits: ${reason.trim()}`
                : `${Math.abs(numericDelta)} credits were deducted: ${reason.trim()}`,
            type: NotificationType.CREDIT,
          },
        }),
      ]);

      sendSuccess(
        res,
        {
          transaction: {
            id: transaction.id,
            memberId: transaction.memberId,
            memberName: updatedMember.name,
            memberDepartment: updatedMember.department.name,
            delta: transaction.delta,
            reason: transaction.reason,
            category: formatCreditCategory(transaction.category),
            timestamp: transaction.timestamp.toISOString().slice(0, 16).replace('T', ' '),
            issuedBy: transaction.issuedBy,
          },
          newBalance: updatedMember.totalCredits,
        },
        'Credits successfully adjusted.'
      );
    } catch (err) {
      next(err);
    }
  }
}
