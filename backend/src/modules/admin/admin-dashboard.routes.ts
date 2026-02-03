/**
 * Admin Dashboard Routes
 * API endpoints for admin dashboard data
 */

import { Router, Request, Response } from 'express';
import { adminDashboardService } from './admin-dashboard.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// All routes require ADMIN role
router.use(authMiddleware);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await adminDashboardService.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get stats';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/dashboard/recent-bookings
 * Get recent bookings
 */
router.get('/recent-bookings', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const bookings = await adminDashboardService.getRecentBookings(limit);
    res.json({
      success: true,
      data: bookings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recent bookings';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/dashboard/recent-users
 * Get recent users
 */
router.get('/recent-users', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const users = await adminDashboardService.getRecentUsers(limit);
    res.json({
      success: true,
      data: users,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get recent users';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/dashboard/activity
 * Get recent activity feed
 */
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const activity = await adminDashboardService.getRecentActivity(limit);
    res.json({
      success: true,
      data: activity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get activity';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/dashboard/health
 * Get system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await adminDashboardService.getSystemHealth();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get health status';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
