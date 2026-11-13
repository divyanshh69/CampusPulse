import { PrismaClient, Prisma, NotificationType, UserStatus } from '@prisma/client';

export type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string | null;
}

export class NotificationService {
  /**
   * Create a single notification for a specific user
   */
  static async notifyUser(
    client: PrismaExecutor,
    params: CreateNotificationParams
  ) {
    return await client.notification.create({
      data: {
        userId: params.userId,
        title: params.title.trim(),
        message: params.message.trim(),
        type: params.type,
        relatedEntityId: params.relatedEntityId || null,
      },
    });
  }

  /**
   * Create notifications for multiple users via bulk creation
   */
  static async notifyUsers(
    client: PrismaExecutor,
    userIds: string[],
    params: Omit<CreateNotificationParams, 'userId'>
  ) {
    if (!userIds || userIds.length === 0) return { count: 0 };
    const uniqueUserIds = Array.from(new Set(userIds));

    return await client.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        title: params.title.trim(),
        message: params.message.trim(),
        type: params.type,
        relatedEntityId: params.relatedEntityId || null,
      })),
    });
  }

  /**
   * Notify all active members of a specific department
   */
  static async notifyDepartmentMembers(
    client: PrismaExecutor,
    departmentId: string,
    params: Omit<CreateNotificationParams, 'userId'>,
    excludeUserId?: string
  ) {
    const members = await client.user.findMany({
      where: {
        departmentId,
        status: UserStatus.ACTIVE,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    const userIds = members.map((m) => m.id);
    return await this.notifyUsers(client, userIds, params);
  }

  /**
   * Notify all active members across the entire club
   */
  static async notifyAllActiveMembers(
    client: PrismaExecutor,
    params: Omit<CreateNotificationParams, 'userId'>,
    excludeUserId?: string
  ) {
    const members = await client.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    const userIds = members.map((m) => m.id);
    return await this.notifyUsers(client, userIds, params);
  }
}

