import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import trackingService, {
  TrackingEventInput,
  TrackingEventTypes,
  EventTypeLabels,
} from './tracking.service';
import { TrackingWebhookService } from './tracking-webhook.service';
import { searatesIntegration } from '../../integrations/searates.integration';
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
    console.error('Get tracking stats error:', error);
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
    console.error('Get event types error:', error);
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
    console.error('Get map data error:', error);
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
      console.error('Update tracking event error:', error);

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
      console.error('Delete tracking event error:', error);

      if (error.message === 'Tracking event not found') {
        return res.status(404).json({ error: 'Tracking event not found' });
      }

      res.status(500).json({ error: error.message || 'Failed to delete tracking event' });
    }
  }
);

/**
 * GET /api/tracking/test-connection
 * Test SeaRates API connection and show status
 * @access ADMIN only
 */
router.get(
  '/test-connection',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const testResult = await searatesIntegration.testConnection();

      res.json({
        service: 'SeaRates API v3',
        baseUrl: 'https://tracking.searates.com',
        configured: searatesIntegration.isConfigured(),
        apiKeyInfo: searatesIntegration.getApiKeyInfo(),
        connectionTest: testResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Test connection error:', error);
      res.status(500).json({
        service: 'SeaRates API v3',
        configured: searatesIntegration.isConfigured(),
        connectionTest: {
          success: false,
          message: error.message || 'Connection test failed',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/tracking/shipping-lines
 * Get list of supported shipping lines
 * @access Public
 */
router.get('/shipping-lines', async (req: Request, res: Response) => {
  try {
    const shippingLines = await searatesIntegration.getShippingLines();
    res.json({
      success: true,
      shippingLines,
    });
  } catch (error: any) {
    console.error('Get shipping lines error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get shipping lines',
    });
  }
});

/**
 * GET /api/tracking/api-status
 * Get SeaRates API status and configuration
 * @access All authenticated users
 */
router.get('/api-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const isConfigured = searatesIntegration.isConfigured();

    let connectionStatus = { success: false, message: 'Not tested' };
    if (isConfigured) {
      connectionStatus = await searatesIntegration.testConnection();
    }

    res.json({
      provider: 'SeaRates',
      version: 'v3',
      baseUrl: 'https://tracking.searates.com',
      configured: isConfigured,
      status: connectionStatus.success ? 'active' : 'inactive',
      message: connectionStatus.message,
      features: {
        containerTracking: true,
        blTracking: true,
        bookingTracking: true,
        routeData: true,
        aisData: true,
        predictedEta: true,
      },
    });
  } catch (error: any) {
    console.error('API status error:', error);
    res.status(500).json({
      provider: 'SeaRates',
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
