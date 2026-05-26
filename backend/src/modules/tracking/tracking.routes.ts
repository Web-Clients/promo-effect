import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import trackingService, {
  TrackingEventInput,
  TrackingEventTypes,
  EventTypeLabels,
} from './tracking.service';
import { TrackingWebhookService } from './tracking-webhook.service';
import { aisstreamIntegration } from '../../integrations/aisstream.integration';
import prisma from '../../lib/prisma';
import { webhookLimiter, emailParseLimiter } from '../../middleware/rateLimit.middleware';
import notificationService from '../../services/notification.service';
import trackGPSService from '../../services/trackgps.service';
import { parseEmailWithGemini, isGeminiConfigured } from '../../services/gemini.service';

// Sub-routers
import containerRoutes from './tracking-container.routes';
import searchRoutes from './tracking-search.routes';
import gpsRoutes from './tracking-gps.routes';
import webhookRoutes from './tracking-webhook.routes';
import logger from '../../utils/logger';

const router = Router();

// ============================================
// TRACKING ROUTES
// ============================================

/**
 * GET /api/tracking/stats
 * Get tracking statistics
 * @access All authenticated users
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const stats = await trackingService.getTrackingStats(user.role, user.clientId);
    res.json(stats);
  } catch (error: any) {
    logger.error('Get tracking stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get statistics' });
  }
});

/**
 * GET /api/tracking/event-types
 * Get list of available event types
 * @access All authenticated users
 */
router.get('/event-types', authMiddleware, async (req: Request, res: Response) => {
  try {
    const eventTypes = Object.entries(TrackingEventTypes).map(([key, value]) => ({
      value: key,
      label: EventTypeLabels[key] || key,
    }));
    res.json(eventTypes);
  } catch (error: any) {
    logger.error('Get event types error:', error);
    res.status(500).json({ error: error.message || 'Failed to get event types' });
  }
});

/**
 * GET /api/tracking/map-data
 * Get data for map visualization
 * @access All authenticated users
 */
router.get('/map-data', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const mapData = await trackingService.getMapData(user.role, user.clientId);
    res.json(mapData);
  } catch (error: any) {
    logger.error('Get map data error:', error);
    res.status(500).json({ error: error.message || 'Failed to get map data' });
  }
});

/**
 * PUT /api/tracking/events/:eventId
 * Update tracking event
 * @access ADMIN, SUPER_ADMIN, OPERATOR
 */
router.put(
  '/events/:eventId',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'OPERATOR']),
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const user = (req as any).user;
      const { eventType, eventDate, location, portName, vessel, latitude, longitude, notes } =
        req.body;

      const eventData: Partial<TrackingEventInput> = {
        eventType,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        location,
        portName,
        vessel,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        notes,
      };

      const event = await trackingService.updateTrackingEvent(eventId, eventData, user.userId);
      res.json(event);
    } catch (error: any) {
      logger.error('Update tracking event error:', error);

      if (error.message === 'Tracking event not found') {
        return res.status(404).json({ error: 'Tracking event not found' });
      }

      res.status(500).json({ error: error.message || 'Failed to update tracking event' });
    }
  }
);

/**
 * DELETE /api/tracking/events/:eventId
 * Delete tracking event
 * @access ADMIN, SUPER_ADMIN
 */
router.delete(
  '/events/:eventId',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const user = (req as any).user;

      const result = await trackingService.deleteTrackingEvent(eventId, user.userId);
      res.json({ message: 'Tracking event deleted successfully', ...result });
    } catch (error: any) {
      logger.error('Delete tracking event error:', error);

      if (error.message === 'Tracking event not found') {
        return res.status(404).json({ error: 'Tracking event not found' });
      }

      res.status(500).json({ error: error.message || 'Failed to delete tracking event' });
    }
  }
);

/**
 * GET /api/tracking/test-connection
 * Test AISStream WebSocket connectivity.
 * @access ADMIN only
 */
router.get(
  '/test-connection',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (_req: Request, res: Response) => {
    try {
      const testResult = await aisstreamIntegration.testConnection();
      res.json({
        service: 'AISStream.io',
        baseUrl: 'wss://stream.aisstream.io/v0/stream',
        configured: aisstreamIntegration.isConfigured(),
        apiKeyInfo: aisstreamIntegration.getApiKeyInfo(),
        connectionTest: testResult,
        cachedPositions: aisstreamIntegration.getAllPositions().length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Test connection error:', error);
      res.status(500).json({
        service: 'AISStream.io',
        configured: aisstreamIntegration.isConfigured(),
        connectionTest: { success: false, message: error.message || 'Connection test failed' },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/tracking/api-status
 * Quick read of provider configuration + cache state. Does not open
 * a new WebSocket — uses the persistent singleton.
 * @access All authenticated users
 */
router.get('/api-status', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const configured = aisstreamIntegration.isConfigured();
    res.json({
      provider: 'AISStream.io',
      version: 'v0',
      baseUrl: 'wss://stream.aisstream.io/v0/stream',
      configured,
      status: configured ? 'active' : 'inactive',
      cachedPositions: aisstreamIntegration.getAllPositions().length,
      features: {
        livePositions: true,
        shipStaticData: true,
        eventStream: false, // carrier events arrive via email parser / manual entry
      },
    });
  } catch (error: any) {
    logger.error('API status error:', error);
    res.status(500).json({
      provider: 'AISStream.io',
      configured: false,
      status: 'error',
      message: error.message,
    });
  }
});

// Mount sub-routers
router.use('/containers', containerRoutes);
router.use('/search', searchRoutes);
router.use('/gps', gpsRoutes);
router.use('/webhook', webhookRoutes);

export default router;
