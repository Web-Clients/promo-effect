import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import trackingService, { TrackingEventInput } from './tracking.service';
import notificationService from '../../services/notification.service';
import prisma from '../../lib/prisma';

const router = Router();

/**
 * GET /api/tracking/containers
 * List all containers for tracking view
 * @access All authenticated users (filtered by role)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as string,
      search: req.query.search as string,
      clientId: req.query.clientId as string,
      bookingId: req.query.bookingId as string,
    };

    const result = await trackingService.getContainers(filters, user.role, user.clientId);
    res.json(result);
  } catch (error: any) {
    console.error('List containers error:', error);
    res.status(500).json({ error: error.message || 'Failed to list containers' });
  }
});

/**
 * GET /api/tracking/containers/:id
 * Get container with full tracking history
 * @access All authenticated users (permission checked)
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const container = await trackingService.getContainerById(id, user.role, user.clientId);
    res.json(container);
  } catch (error: any) {
    console.error('Get container error:', error);

    if (error.message === 'Container not found') {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(500).json({ error: error.message || 'Failed to get container' });
  }
});

/**
 * GET /api/tracking/containers/:id/route
 * Get container route for map path
 * @access All authenticated users
 */
router.get('/:id/route', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = await trackingService.getContainerRoute(id);
    res.json(route);
  } catch (error: any) {
    console.error('Get route error:', error);
    res.status(500).json({ error: error.message || 'Failed to get route' });
  }
});

/**
 * POST /api/tracking/containers/:id/events
 * Add manual tracking event
 * @access ADMIN, SUPER_ADMIN, OPERATOR
 */
router.post(
  '/:id/events',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'AGENT']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { eventType, eventDate, location, portName, vessel, latitude, longitude, notes } =
        req.body;

      // Validation
      if (!eventType) {
        return res.status(400).json({ error: 'Event type is required' });
      }
      if (!eventDate) {
        return res.status(400).json({ error: 'Event date is required' });
      }
      if (!location) {
        return res.status(400).json({ error: 'Location is required' });
      }

      const eventData: TrackingEventInput = {
        eventType,
        eventDate: new Date(eventDate),
        location,
        portName,
        vessel,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        notes,
      };

      const event = await trackingService.addTrackingEvent(id, eventData, user.userId);
      res.status(201).json(event);
    } catch (error: any) {
      console.error('Add tracking event error:', error);

      if (error.message === 'Container not found') {
        return res.status(404).json({ error: 'Container not found' });
      }
      if (error.message.includes('Invalid event type')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('Invalid event order')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message || 'Failed to add tracking event' });
    }
  }
);

/**
 * POST /api/tracking/containers/:id/refresh-tracking
 * Force refresh tracking from external sources
 * @access ADMIN, OPERATOR
 */
router.post(
  '/:id/refresh-tracking',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'OPERATOR']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const container = await prisma.container.findUnique({
        where: { id },
        include: { booking: true },
      });

      if (!container) {
        return res.status(404).json({ error: 'Container not found' });
      }

      // Call refreshTracking which uses SeaRates web integration
      const result = await trackingService.refreshTracking(id);

      res.json({
        success: result.success,
        message: result.success
          ? `Tracking refreshed. Found ${result.eventsFound} new events.`
          : 'Tracking refresh failed',
        containerId: id,
        eventsFound: result.eventsFound,
        error: result.error,
        lastSyncAt: new Date(),
      });
    } catch (error: any) {
      console.error('Refresh tracking error:', error);
      res.status(500).json({ error: error.message || 'Failed to refresh tracking' });
    }
  }
);

/**
 * GET /api/tracking/containers/:id/timeline
 * Get complete timeline for container (tracking events, modifications, notifications, documents)
 * @access All authenticated users (permission checked)
 */
router.get('/:id/timeline', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const container = await prisma.container.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    // Permission check
    if (user.role === 'CLIENT' && container.booking.clientId !== user.clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all timeline events
    const [trackingEvents, auditLogs, notifications, documents] = await Promise.all([
      prisma.trackingEvent.findMany({
        where: { containerId: id },
        orderBy: { eventDate: 'asc' },
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: 'Container',
          entityId: id,
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.notification.findMany({
        where: {
          bookingId: container.bookingId,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.document.findMany({
        where: {
          bookingId: container.bookingId,
        },
        orderBy: { uploadedAt: 'asc' },
      }),
    ]);

    // Combine and sort all events
    const timeline = [
      ...trackingEvents.map((e) => ({
        type: 'tracking',
        id: e.id,
        date: e.eventDate,
        title: `Tracking: ${e.eventType}`,
        description: `${e.location}${e.vessel ? ` - ${e.vessel}` : ''}`,
        data: e,
      })),
      ...auditLogs.map((log) => ({
        type: 'system',
        id: log.id,
        date: log.createdAt,
        title: `System: ${log.action}`,
        description: log.changes ? JSON.parse(log.changes) : '',
        user: log.user,
        data: log,
      })),
      ...notifications.map((n) => ({
        type: 'notification',
        id: n.id,
        date: n.createdAt,
        title: `Notification: ${n.title}`,
        description: n.message,
        data: n,
      })),
      ...documents.map((d) => ({
        type: 'document',
        id: d.id,
        date: d.uploadedAt,
        title: `Document: ${d.fileName}`,
        description: d.fileType,
        data: d,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      containerId: id,
      containerNumber: container.containerNumber,
      timeline,
    });
  } catch (error: any) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: error.message || 'Failed to get timeline' });
  }
});

/**
 * POST /api/tracking/containers/:id/notify
 * Send manual notification to client about container
 * @access ADMIN, OPERATOR
 */
router.post(
  '/:id/notify',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'OPERATOR']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { type, message, channels } = req.body;

      const container = await prisma.container.findUnique({
        where: { id },
        include: {
          booking: {
            include: {
              client: true,
            },
          },
        },
      });

      if (!container) {
        return res.status(404).json({ error: 'Container not found' });
      }

      // Get client users
      const clientUsers = await prisma.user.findMany({
        where: {
          // TODO: Add clientId relation to User model or find through Client
          // For now, we'll use a workaround
        },
      });

      // Parse channels
      const channelsArray = (channels || 'email').split(',').map((c: string) => c.trim());
      const channelsObj = {
        email: channelsArray.includes('email'),
        sms: channelsArray.includes('sms'),
        whatsapp: channelsArray.includes('whatsapp'),
        push: channelsArray.includes('push'),
      };

      // Send notification to client (using booking clientId as userId for now)
      // TODO: Get actual user IDs associated with the client
      const result = await notificationService.sendNotification({
        userId: container.booking.clientId, // TODO: Replace with actual user ID
        bookingId: container.bookingId,
        type: type || 'CONTAINER_UPDATE',
        title: `Container ${container.containerNumber}`,
        message: message || `Update for container ${container.containerNumber}`,
        channels: channelsObj,
      });

      res.json({
        success: true,
        message: 'Notification sent',
        notificationId: result.notificationId,
        channels: result.channels,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Send notification error:', error);
      res.status(500).json({ error: error.message || 'Failed to send notification' });
    }
  }
);

export default router;
