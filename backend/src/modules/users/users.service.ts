/**
 * Users Service
 * Business logic for user management
 */

import prisma from '../../lib/prisma';
import bcrypt from 'bcrypt';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
  role?: string;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  company?: string;
  role?: string;
  emailVerified?: boolean;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

export class UsersService {
  /**
   * Get all users with pagination and filters
   */
  async findAll(filters: UserFilters) {
    const {
      page = 1,
      limit = 20,
      role,
      search,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastLoginIp: true as any, // Field exists in schema
        language: true,
        timezone: true,
        notificationPreferences: true,
        twoFactorEnabled: true,
        // Не возвращаем passwordHash, twoFactorSecret, backupCodes
      },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastLoginIp: true as any, // Field exists in schema
        language: true,
        timezone: true,
        notificationPreferences: true,
        twoFactorEnabled: true,
        agentProfile: {
          select: {
            id: true,
            agentCode: true,
            company: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Create new user
   */
  async create(input: CreateUserInput) {
    // Проверка уникальности email
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(input.password, 12);

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        company: input.company,
        role: input.role || 'CLIENT',
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput) {
    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Обновление
    const user = await prisma.user.update({
      where: { id },
      data: input,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Delete user (soft delete - mark as inactive)
   */
  async delete(id: string, currentUserId: string) {
    // Нельзя удалить самого себя
    if (id === currentUserId) {
      throw new Error('Cannot delete your own account');
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Soft delete - можно добавить поле isActive в схему
    // Пока просто удаляем (в production лучше soft delete)
    await prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Get user activity history
   */
  async getActivity(userId: string, filters: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: { userId } }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reset user password (admin only)
   */
  async resetPassword(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Генерируем временный пароль
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // В production здесь нужно отправить email с временным паролем
    return {
      message: 'Password reset successfully',
      tempPassword, // В production не возвращать!
    };
  }
}

