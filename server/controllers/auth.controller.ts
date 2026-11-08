import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { UserRole, AcademicYear } from '@prisma/client';

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
  return AcademicYear.FIRST_YEAR;
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

export class AuthController {
  /**
   * Diagnostic status of the auth module
   */
  static async status(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      module: 'auth',
      status: 'initialized',
      endpoints: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'GET /api/auth/me',
      ],
      security: {
        passwordHashing: 'bcrypt (salt rounds = 10)',
        tokenType: 'JWT (HMAC SHA-256)',
        rbacEnabled: true,
      },
    });
  }

  /**
   * User login with email and password
   */
  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        sendError(res, 'Email and password are required.', 400);
        return;
      }

      // Check user in database
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { department: true },
      });

      if (!user) {
        sendError(res, 'Invalid email or password.', 401);
        return;
      }

      if (user.passwordHash) {
        const isMatch = await comparePassword(password, user.passwordHash);
        if (!isMatch) {
          sendError(res, 'Invalid email or password.', 401);
          return;
        }
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        name: user.name,
      });

      sendSuccess(
        res,
        {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentId: user.departmentId,
            departmentName: user.department.name,
          },
        },
        'Login successful.'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * User registration
   */
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        name,
        email,
        password,
        studentId,
        major,
        departmentId,
        academicYear,
      } = req.body;

      if (!name || !email || !password || !studentId || !major || !departmentId) {
        sendError(
          res,
          'Required fields: name, email, password, studentId, major, departmentId.',
          400
        );
        return;
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: email.toLowerCase() }, { studentId }],
        },
      });

      if (existingUser) {
        sendError(res, 'A user with this email or student ID already exists.', 409);
        return;
      }

      const passwordHash = await hashPassword(password);

      const newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          studentId,
          major,
          departmentId,
          academicYear: mapAcademicYear(academicYear),
          role: UserRole.MEMBER,
          joinedDate: new Date().toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
        },
        include: { department: true },
      });

      const token = signToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        departmentId: newUser.departmentId,
        name: newUser.name,
      });

      sendSuccess(
        res,
        {
          token,
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            departmentId: newUser.departmentId,
            departmentName: newUser.department.name,
          },
        },
        'Registration successful.',
        201
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get current authenticated user profile
   */
  static async me(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized.', 401);
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { department: true },
      });

      if (!user) {
        sendError(res, 'User profile not found.', 404);
        return;
      }

      const { passwordHash, ...safeUser } = user;
      sendSuccess(res, {
        ...safeUser,
        academicYear: formatAcademicYear(safeUser.academicYear),
      });
    } catch (err) {
      next(err);
    }
  }
}

