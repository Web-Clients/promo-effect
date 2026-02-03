/**
 * Notifications Service
 * Business logic for notification management
 */

import prisma from '../../lib/prisma';
import notificationService from '../../services/notification.service';

export interface CreateNotificationInput {
  userId: string;
  bookingId?: string;
  type: string;
  title: string;
  message: string;
  channels: string; // comma-separated: "email,sms,whatsapp"
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  userId?: string;
  type?: string;
  read?: boolean;
  sent?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export class NotificationsService {
  /**
   * Get all notifications with pagination and filters
   */
  async findAll(filters: NotificationFilters) {
    const {
      page = 1,
      limit = 20,
      userId,
      type,
      read,
      sent,
      dateFrom,
      dateTo,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (read !== undefined) {
      where.read = read;
    }

    if (sent !== undefined) {
      where.sent = sent;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          booking: {
            select: {
              id: true,
              portOrigin: true,
              portDestination: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get notification by ID
   */
  async findById(id: string) {
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        booking: true,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  /**
   * Create new notification and send it
   */
  async create(input: CreateNotificationInput) {
    // Parse channels string to object
    const channelsArray = input.channels.split(',').map((c) => c.trim());
    const channels = {
      email: channelsArray.includes('email'),
      sms: channelsArray.includes('sms'),
      whatsapp: channelsArray.includes('whatsapp'),
      push: channelsArray.includes('push'),
    };

    // Send notification through service
    const result = await notificationService.sendNotification({
      userId: input.userId,
      bookingId: input.bookingId,
      type: input.type,
      title: input.title,
      message: input.message,
      channels,
    });

    // Get the created notification
    const notification = await prisma.notification.findUnique({
      where: { id: result.notificationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return {
      ...notification,
      sendResults: result.channels,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string) {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  /**
   * Mark notification as sent
   */
  async markAsSent(id: string) {
    return await prisma.notification.update({
      where: { id },
      data: {
        sent: true,
        sentAt: new Date(),
      },
    });
  }

  /**
   * Get unread notifications count for user
   */
  async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { message: 'All notifications marked as read' };
  }

  /**
   * Delete notification
   */
  async delete(id: string) {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.delete({
      where: { id },
    });

    return { message: 'Notification deleted successfully' };
  }
}

