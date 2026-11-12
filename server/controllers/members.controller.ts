import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { hashPassword } from '../utils/password';
import { UserRole, AcademicYear, UserStatus } from '@prisma/client';

function mapUserRole(role?: string): UserRole {
  if (role === 'Admin' || role === 'ADMIN') return UserRole.ADMIN;
  if (role === 'Department Head' || role === 'DEPARTMENT_HEAD') return UserRole.DEPARTMENT_HEAD;
  return UserRole.MEMBER;
}

function formatAcademicYear(year?: AcademicYear | string | null): string {
  if (!year) return '2nd Year';
  const str = String(year);
  if (str === 'FIRST_YEAR' || str === 'FRESHMAN' || str === '1st Year') return '1st Year';
  if (str === 'SECOND_YEAR' || str === 'SOPHOMORE' || str === '2nd Year') return '2nd Year';
  if (str === 'THIRD_YEAR' || str === 'JUNIOR' || str === '3rd Year') return '3rd Year';
  if (str === 'FOURTH_YEAR' || str === 'SENIOR' || str === '4th Year') return '4th Year';
  return '2nd Year';
}

function mapAcademicYear(year?: string): AcademicYear {
  const upper = (year || '').trim().toUpperCase();
  if (upper === '1ST YEAR' || upper === 'FIRST_YEAR' || upper === 'FRESHMAN' || upper === '1ST') {
    return AcademicYear.FIRST_YEAR;
  }
  if (upper === '2ND YEAR' || upper === 'SECOND_YEAR' || upper === 'SOPHOMORE' || upper === '2ND') {
    return AcademicYear.SECOND_YEAR;
  }
  if (upper === '3RD YEAR' || upper === 'THIRD_YEAR' || upper === 'JUNIOR' || upper === '3RD') {
    return AcademicYear.THIRD_YEAR;
  }
  if (upper === '4TH YEAR' || upper === 'FOURTH_YEAR' || upper === 'SENIOR' || upper === '4TH') {
    return AcademicYear.FOURTH_YEAR;
  }
  return AcademicYear.SECOND_YEAR;
}

function formatMemberResponse(member: any) {
  if (!member) return member;
  const { passwordHash, ...safe } = member;
  return {
    ...safe,
    academicYear: formatAcademicYear(safe.academicYear),
  };
}

function mapUserStatus(status?: string): UserStatus {
  const upper = (status || '').toUpperCase();
  if (upper === 'PROBATION') return UserStatus.PROBATION;
  if (upper === 'ALUMNI') return UserStatus.ALUMNI;
  return UserStatus.ACTIVE;
}

/**
 * Resolves a departmentId from either an ID ('dept-tech') or name ('Technical & Engineering').
 */
async function resolveDepartmentId(deptInput: string): Promise<string | null> {
  if (!deptInput) return null;
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

export class MembersController {
  /**
   * Diagnostic status of members module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'members',
      status: 'active',
      endpoints: [
        'GET /api/members',
        'GET /api/members/:id',
        'POST /api/members',
        'PATCH /api/members/:id',
        'DELETE /api/members/:id',
        'GET /api/members/leaderboard',
      ],
    });
  }

  /**
   * List members with optional filtering
   */
  static async listMembers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { search, departmentId, role } = req.query;

      const where: any = {};
      if (departmentId && typeof departmentId === 'string' && departmentId !== 'All') {
        const resolved = await resolveDepartmentId(departmentId);
        if (resolved) where.departmentId = resolved;
      }
      if (role && typeof role === 'string' && role !== 'All') {
        where.role = mapUserRole(role);
      }
      if (search && typeof search === 'string' && search.trim()) {
        const q = search.trim();
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { studentId: { contains: q, mode: 'insensitive' } },
          { major: { contains: q, mode: 'insensitive' } },
        ];
      }

      const members = await prisma.user.findMany({
        where,
        include: { department: true },
        orderBy: { name: 'asc' },
      });

      const safeMembers = members.map(formatMemberResponse);
      sendSuccess(res, safeMembers);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single member by ID
   */
  static async getMemberById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const member = await prisma.user.findUnique({
        where: { id },
        include: {
          department: true,
          attendanceRecords: { take: 10, orderBy: { markedAt: 'desc' } },
          creditTransactions: { take: 10, orderBy: { timestamp: 'desc' } },
          assignedTasks: { take: 10, orderBy: { deadline: 'asc' } },
        },
      });

      if (!member) {
        sendError(res, 'Member not found.', 404);
        return;
      }

      // Privacy protection: Regular members viewing another peer's profile cannot see private logs
      if (req.user?.role === UserRole.MEMBER && req.user.userId !== member.id) {
        const { attendanceRecords, creditTransactions, assignedTasks, ...publicProfile } = member;
        sendSuccess(res, formatMemberResponse(publicProfile));
        return;
      }

      sendSuccess(res, formatMemberResponse(member));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new member with RBAC enforcement
   */
  static async createMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        name,
        email,
        studentId,
        major,
        departmentId,
        role,
        academicYear,
        bio,
      } = req.body;

      if (!name || !email || !studentId || !major || !departmentId) {
        sendError(
          res,
          'Required fields: name, email, studentId, major, departmentId.',
          400
        );
        return;
      }

      // Resolve department
      const resolvedDeptId = await resolveDepartmentId(departmentId);
      if (!resolvedDeptId) {
        sendError(res, `Specified department '${departmentId}' does not exist.`, 400);
        return;
      }

      const targetRole = mapUserRole(role);

      // RBAC Enforcement
      if (req.user?.role === UserRole.DEPARTMENT_HEAD) {
        if (resolvedDeptId !== req.user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only add members to their own department.',
            403
          );
          return;
        }
        if (targetRole === UserRole.ADMIN) {
          sendError(
            res,
            'Forbidden: Department Heads cannot create Admin accounts.',
            403
          );
          return;
        }
      }

      // Check unique constraints (email & studentId)
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.trim().toLowerCase() },
            { studentId: studentId.trim() },
          ],
        },
      });

      if (existing) {
        if (existing.email.toLowerCase() === email.trim().toLowerCase()) {
          sendError(res, 'A member with this email address already exists.', 409);
        } else {
          sendError(res, 'A member with this Student ID already exists.', 409);
        }
        return;
      }

      // Secure default password hash for newly onboarded members
      const defaultPasswordHash = await hashPassword('campusPulse123!');

      const member = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: defaultPasswordHash,
          studentId: studentId.trim(),
          major: major.trim(),
          departmentId: resolvedDeptId,
          role: targetRole,
          academicYear: mapAcademicYear(academicYear),
          bio: bio ? bio.trim() : null,
          joinedDate: new Date().toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          attendancePercentage: 100,
          totalCredits: 50,
          status: UserStatus.ACTIVE,
        },
        include: { department: true },
      });

      sendSuccess(res, formatMemberResponse(member), 'Member created successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update an existing member with RBAC enforcement
   */
  static async updateMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        major,
        departmentId,
        role,
        academicYear,
        status,
        bio,
      } = req.body;

      const existingMember = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingMember) {
        sendError(res, 'Member not found.', 404);
        return;
      }

      // Resolve department if changed
      let resolvedDeptId = existingMember.departmentId;
      if (departmentId) {
        const found = await resolveDepartmentId(departmentId);
        if (!found) {
          sendError(res, `Department '${departmentId}' does not exist.`, 400);
          return;
        }
        resolvedDeptId = found;
      }

      // RBAC Enforcement for Department Heads
      if (req.user?.role === UserRole.DEPARTMENT_HEAD) {
        if (existingMember.departmentId !== req.user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only edit members within their own department.',
            403
          );
          return;
        }
        if (resolvedDeptId !== req.user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads cannot reassign members to another department.',
            403
          );
          return;
        }
        if (role && mapUserRole(role) === UserRole.ADMIN) {
          sendError(
            res,
            'Forbidden: Department Heads cannot promote members to Admin.',
            403
          );
          return;
        }
        if (existingMember.role === UserRole.ADMIN) {
          sendError(
            res,
            'Forbidden: Department Heads cannot modify Admin accounts.',
            403
          );
          return;
        }
      }

      // Check email uniqueness if email is changed
      if (email && email.trim().toLowerCase() !== existingMember.email.toLowerCase()) {
        const emailConflict = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
        });
        if (emailConflict) {
          sendError(res, 'Another member with this email address already exists.', 409);
          return;
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name.trim();
      if (email) updateData.email = email.trim().toLowerCase();
      if (major) updateData.major = major.trim();
      if (departmentId) updateData.departmentId = resolvedDeptId;
      if (role) updateData.role = mapUserRole(role);
      if (academicYear) updateData.academicYear = mapAcademicYear(academicYear);
      if (status) updateData.status = mapUserStatus(status);
      if (bio !== undefined) updateData.bio = bio ? bio.trim() : null;

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { department: true },
      });

      sendSuccess(res, formatMemberResponse(updated), 'Member updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Safe deactivation / soft-delete (sets status to ALUMNI)
   */
  static async deactivateMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const existingMember = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingMember) {
        sendError(res, 'Member not found.', 404);
        return;
      }

      // RBAC Enforcement
      if (req.user?.role === UserRole.DEPARTMENT_HEAD) {
        if (existingMember.departmentId !== req.user.departmentId) {
          sendError(
            res,
            'Forbidden: Department Heads can only deactivate members within their own department.',
            403
          );
          return;
        }
        if (existingMember.role === UserRole.ADMIN) {
          sendError(
            res,
            'Forbidden: Department Heads cannot deactivate Admin accounts.',
            403
          );
          return;
        }
        if (existingMember.id === req.user.userId) {
          sendError(res, 'Forbidden: You cannot deactivate your own account.', 403);
          return;
        }
      }

      // Prevent Admin from accidentally deactivating their own active session
      if (existingMember.id === req.user?.userId) {
        sendError(res, 'You cannot deactivate your own active authenticated account.', 400);
        return;
      }

      // Clear department head assignment if the deactivated member was head of a department
      await prisma.department.updateMany({
        where: { headId: id },
        data: { headId: null },
      });

      // Soft-deactivate by setting status to ALUMNI, preserving historical records
      const deactivated = await prisma.user.update({
        where: { id },
        data: {
          status: UserStatus.ALUMNI,
        },
        include: { department: true },
      });

      sendSuccess(
        res,
        formatMemberResponse(deactivated),
        `Member '${existingMember.name}' has been safely deactivated (status set to Alumni).`
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Leaderboard sorted by total credits
   */
  static async getLeaderboard(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const leaderboard = await prisma.user.findMany({
        take: 50,
        orderBy: [{ totalCredits: 'desc' }, { attendancePercentage: 'desc' }],
        include: { department: true },
      });

      const safe = leaderboard.map(({ passwordHash, ...m }) => m);
      sendSuccess(res, safe);
    } catch (err) {
      next(err);
    }
  }
}
