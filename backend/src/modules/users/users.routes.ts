/**
 * Users Routes
 * API endpoints for user management
 */

import { Router, Request, Response } from 'express';
import { UsersService } from './users.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();
const usersService = new UsersService();

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Получить список пользователей
 *     description: Возвращает список всех пользователей с пагинацией и фильтрацией. Доступно только для ADMIN.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Количество записей на странице
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [CLIENT, AGENT, OPERATOR, ADMIN, SUPER_ADMIN]
 *         description: Фильтр по роли
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по email, имени или компании
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get(
  '/',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        role: req.query.role as string,
        search: req.query.search as string,
      };

      const result = await usersService.findAll(filters);
      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch users';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Получить детали пользователя
 *     description: Возвращает детальную информацию о пользователе. Пользователи могут видеть только свой профиль, ADMIN - любой.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Нет доступа
 *       404:
 *         description: Пользователь не найден
 */
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const currentUser = (req as any).user;

      // Users can only access their own profile, unless they're ADMIN
      if (userId !== currentUser.id && !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString(),
        });
      }

      const user = await usersService.findById(userId);
      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'User not found';
      const status = message === 'User not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Обновить пользователя
 *     description: Обновляет информацию о пользователе. Пользователи могут обновлять только свой профиль, ADMIN - любой.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               company:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [CLIENT, AGENT, OPERATOR, ADMIN, SUPER_ADMIN]
 *                 description: Только ADMIN может изменять роль
 *     responses:
 *       200:
 *         description: Успешное обновление
 *       403:
 *         description: Нет доступа
 *       404:
 *         description: Пользователь не найден
 */
router.put(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const currentUser = (req as any).user;

      // Users can only update their own profile, unless they're ADMIN
      if (userId !== currentUser.id && !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString(),
        });
      }

      // Only ADMIN can update role
      const updateData: any = { ...req.body };
      if (updateData.role && !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
        delete updateData.role;
      }

      // SUPER_ADMIN role protection
      if (updateData.role) {
        // Get the target user to check their current role
        const targetUser = await usersService.findById(userId);

        // Only SUPER_ADMIN can assign SUPER_ADMIN role
        if (updateData.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
          return res.status(403).json({
            success: false,
            error: 'Only SUPER_ADMIN can assign SUPER_ADMIN role',
            timestamp: new Date().toISOString(),
          });
        }

        // Only SUPER_ADMIN can demote another SUPER_ADMIN
        if (targetUser.role === 'SUPER_ADMIN' && updateData.role !== 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
          return res.status(403).json({
            success: false,
            error: 'Only SUPER_ADMIN can change the role of another SUPER_ADMIN',
            timestamp: new Date().toISOString(),
          });
        }
      }

      const user = await usersService.update(userId, updateData);
      res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * DELETE /api/v1/users/:id
 * Delete user (soft delete)
 * Access: ADMIN only
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const currentUser = (req as any).user;

      const result = await usersService.delete(userId, currentUser.id);
      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/v1/users/:id/activity
 * Get user activity history
 * Access: Own profile or ADMIN
 */
router.get(
  '/:id/activity',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const currentUser = (req as any).user;

      if (userId !== currentUser.id && !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString(),
        });
      }

      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await usersService.getActivity(userId, filters);
      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch activity';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/users/:id/reset-password-admin
 * Reset user password (admin only)
 * Access: ADMIN only
 */
router.post(
  '/:id/reset-password-admin',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const result = await usersService.resetPassword(userId);
      res.json({
        success: true,
        message: result.message,
        // В production не возвращать tempPassword!
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;

