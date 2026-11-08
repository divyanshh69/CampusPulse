import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { CreditCategory } from '@prisma/client';

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
        'GET /api/credits/member/:memberId',
        'POST /api/credits/adjust',
      ],
    });
  }

  /**
   * List recent credit transactions
   */
  static async listTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = '50', memberId } = req.query;

      const where: any = {};
      if (memberId && typeof memberId === 'string') {
        where.memberId = memberId;
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
        category: t.category,
        timestamp: t.timestamp.toISOString(),
        issuedBy: t.issuedBy,
      }));

      sendSuccess(res, formatted);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Adjust member credits (award or penalty)
   */
  static async adjustCredits(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
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

      const issuedBy = req.user?.name || 'Administrator';
      const issuerId = req.user?.userId;

      // Atomic transaction: update member totalCredits and record transaction
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
            category: category as CreditCategory,
            issuedBy,
            issuerId,
          },
        }),
      ]);

      sendSuccess(
        res,
        {
          transaction,
          newBalance: updatedMember.totalCredits,
        },
        'Credits successfully adjusted.'
      );
    } catch (err) {
      next(err);
    }
  }
}

