/**
 * Notifications Routes
 * API endpoints for notification management
 */

import { Router, Request, Response } from 'express';
import { NotificationsService } from './notifications.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const notificationsService = new NotificationsService();

/**
 * GET /api/v1/notifications
 * List all notifications with pagination and filters
 * Access: Authenticated users (own notifications or ADMIN)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const filters: any = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      type: req.query.type as string,
      read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
      sent: req.query.sent === 'true' ? true : req.query.sent === 'false' ? false : undefined,
      dateFrom: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      dateTo: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
    };

    // CLIENT users can only see their own notifications
    if (currentUser.role === 'CLIENT') {
      filters.userId = currentUser.id;
    } else if (req.query.user_id) {
      // ADMIN can filter by user_id
      filters.userId = req.query.user_id as string;
    }

    const result = await notificationsService.findAll(filters);
    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/notifications/:id
 * Get notification details
 * Access: Own notification or ADMIN
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const notification = await notificationsService.findById(req.params.id);

    // Check access
    if (notification.userId !== currentUser.id && !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: notification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Notification not found';
    const status = message === 'Notification not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/notifications
 * Create new notification
 * Access: ADMIN, MANAGER, OPERATOR
 */
router.post(
  '/',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const notification = await notificationsService.create(req.body);
      res.status(201).json({
        success: true,
        data: notification,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create notification';
      res.status(400).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark notification as read
 * Access: Own notification
 */
router.patch('/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const notification = await notificationsService.findById(req.params.id);

    if (notification.userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
    }

    const updated = await notificationsService.markAsRead(req.params.id);
    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark as read';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/notifications/unread/count
 * Get unread notifications count
 * Access: Authenticated users
 */
router.get('/unread/count', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const count = await notificationsService.getUnreadCount(currentUser.id);
    res.json({
      success: true,
      data: { count },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get count';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/notifications/read-all
 * Mark all notifications as read
 * Access: Authenticated users
 */
router.post('/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const result = await notificationsService.markAllAsRead(currentUser.id);
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark all as read';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

