import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import trackingService, { TrackingEventInput, TrackingEventTypes, EventTypeLabels } from './tracking.service';
import { TrackingWebhookService } from './tracking-webhook.service';
import { searatesIntegration } from '../../integrations/searates.integration';
import prisma from '../../lib/prisma';
import { webhookLimiter, emailParseLimiter } from '../../middleware/rateLimit.middleware';
import notificationService from '../../services/notification.service';
import trackGPSService from '../../services/trackgps.service';

const router = Router();
const webhookService = new TrackingWebhookService();

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
 * GET /api/tracking/containers
 * List all containers for tracking view
 * @access All authenticated users (filtered by role)
 */
router.get('/containers', authMiddleware, async (req: Request, res: Response) => {
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
router.get('/containers/:id', authMiddleware, async (req: Request, res: Response) => {
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
 * GET /api/tracking/search/:containerNumber
 * Search container by number
 * @access All authenticated users (permission checked)
 */
router.get('/search/:containerNumber', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { containerNumber } = req.params;
    const user = (req as any).user;

    // First try to find in local database
    try {
      const container = await trackingService.getContainerByNumber(
        containerNumber,
        user.role,
        user.clientId
      );

      // Auto-refresh from SeaRates if data is stale (no status or last sync > 4 hours ago)
      const needsRefresh = !container.currentStatus ||
        !container.lastSyncAt ||
        (new Date().getTime() - new Date(container.lastSyncAt).getTime() > 4 * 60 * 60 * 1000);

      if (needsRefresh && searatesIntegration.isConfigured()) {
        console.log(`[Tracking] Auto-refreshing ${containerNumber} from SeaRates...`);
        try {
          await trackingService.refreshTracking(container.id);
          // Re-fetch updated container
          const updated = await trackingService.getContainerByNumber(
            containerNumber,
            user.role,
            user.clientId
          );
          return res.json(updated);
        } catch (refreshErr) {
          console.error('[Tracking] Auto-refresh failed:', refreshErr);
          // Return stale local data if refresh fails
        }
      }

      return res.json(container);
    } catch (localError: any) {
      // If not found locally, try SeaRates API
      if (localError.message === 'Container not found' && searatesIntegration.isConfigured()) {
        console.log(`[Tracking] Container ${containerNumber} not found locally, trying SeaRates API...`);

        const searatesData = await searatesIntegration.getContainerTracking(
          containerNumber.toUpperCase(),
          { sealine: 'auto', includeRoute: true, forceUpdate: false }
        );

        if (searatesData) {
          // Return SeaRates data formatted as a container response
          return res.json({
            id: `searates-${containerNumber}`,
            containerNumber: searatesData.containerNumber,
            type: searatesData.sizeType,
            currentStatus: searatesData.status || 'UNKNOWN',
            currentLocation: searatesData.location?.name,
            currentLat: searatesData.location?.latitude,
            currentLng: searatesData.location?.longitude,
            eta: searatesData.eta,
            apiSource: 'SEARATES',
            lastSyncAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            booking: {
              id: 'external',
              bookingNumber: searatesData.bookingNumber || containerNumber,
              origin: searatesData.originPort || 'Unknown',
              destination: searatesData.destinationPort || 'Unknown',
            },
            trackingEvents: searatesData.events?.map((event, index) => ({
              id: `event-${index}`,
              containerId: `searates-${containerNumber}`,
              eventType: event.eventCode || event.type || 'UPDATE',
              eventDate: event.occurredAt,
              location: event.location?.name || 'Unknown',
              portName: event.facility?.name,
              vessel: event.vessel?.name,
              notes: event.description,
              createdAt: event.occurredAt,
            })) || [],
            _source: 'SEARATES_API',
            _shippingLine: {
              code: searatesData.shippingLine,
              name: searatesData.shippingLineName,
            },
            _vessel: searatesData.vessel,
            _voyage: searatesData.voyage,
          });
        }
      }

      // Re-throw the original error if SeaRates also didn't find it
      throw localError;
    }
  } catch (error: any) {
    console.error('Search container error:', error);

    if (error.message === 'Container not found') {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(500).json({ error: error.message || 'Failed to search container' });
  }
});

/**
 * GET /api/tracking/containers/:id/route
 * Get container route for map path
 * @access All authenticated users
 */
router.get('/containers/:id/route', authMiddleware, async (req: Request, res: Response) => {
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
  '/containers/:id/events',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'AGENT']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { eventType, eventDate, location, portName, vessel, latitude, longitude, notes } = req.body;

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
      const { eventType, eventDate, location, portName, vessel, latitude, longitude, notes } = req.body;

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
 * POST /api/v1/tracking/webhook
 * Webhook endpoint for external tracking providers (SeaRates web integration, etc.)
 * @access Public (with signature verification)
 */
router.post('/webhook', webhookLimiter, async (req: Request, res: Response) => {
  try {
    // Get signature - handle both string and string[] types
    const signatureHeader = req.headers['x-signature'] || req.headers['x-searates-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : (signatureHeader as string | undefined);

    // Get provider - handle both string and string[] types
    const providerHeader = req.headers['x-provider'] || 'SEARATES';
    const provider = Array.isArray(providerHeader) ? providerHeader[0] : (providerHeader as string);

    const source = Array.isArray(req.headers['x-source'])
      ? req.headers['x-source'][0]
      : (req.headers['x-source'] as string | undefined) || provider;

    const payload = req.body;

    // Check if this is a SeaRates webhook (has specific format)
    let result;
    if (provider === 'SEARATES' || payload.event || payload.container) {
      result = await webhookService.processSeaRatesWebhook(payload, signature);
    } else {
      // Generic webhook format
      const webhookPayload = {
        ...payload,
        source,
      };
      result = await webhookService.processWebhook(webhookPayload, signature, provider);
    }

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process webhook',
    });
  }
});

/**
 * POST /api/v1/tracking/parse-email
 * Parse email forwarded from partners in China using AI
 * @access ADMIN, OPERATOR
 */
router.post(
  '/parse-email',
  authMiddleware,
  emailParseLimiter,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'OPERATOR']),
  async (req: Request, res: Response) => {
    try {
      const { emailContent, attachments } = req.body;

      if (!emailContent) {
        return res.status(400).json({ error: 'Email content is required' });
      }

      // TODO: Implement AI parsing using Gemini/OpenAI
      // This should extract: B/L number, container number, shipping line, ports, dates, etc.

      res.status(501).json({
        message: 'Email parsing not yet implemented',
        // TODO: Return parsed data
      });
    } catch (error: any) {
      console.error('Parse email error:', error);
      res.status(500).json({ error: error.message || 'Failed to parse email' });
    }
  }
);

/**
 * GET /api/v1/tracking/vessel/:vesselName
 * Get vessel tracking information
 * @access All authenticated users
 */
router.get('/vessel/:vesselName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { vesselName } = req.params;

    // Find all containers on this vessel
    const containers = await prisma.container.findMany({
      where: {
        trackingEvents: {
          some: {
            vessel: {
              contains: vesselName,
              mode: 'insensitive',
            },
            eventType: {
              in: ['LOADED_ON_VESSEL', 'VESSEL_DEPARTURE', 'VESSEL_ARRIVAL', 'IN_TRANSIT'],
            },
          },
        },
      },
      include: {
        booking: {
          include: {
            client: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
        trackingEvents: {
          where: {
            vessel: {
              contains: vesselName,
              mode: 'insensitive',
            },
          },
          orderBy: { eventDate: 'desc' },
          take: 1,
        },
      },
    });

    // Get latest position from tracking events
    const latestEvents = await prisma.trackingEvent.findMany({
      where: {
        vessel: {
          contains: vesselName,
          mode: 'insensitive',
        },
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { eventDate: 'desc' },
      take: 1,
    });

    const vesselInfo = {
      vesselName,
      containers: containers.map((c) => ({
        id: c.id,
        containerNumber: c.containerNumber,
        client: c.booking.client.companyName,
        currentStatus: c.currentStatus,
        eta: c.eta,
      })),
      latestPosition: latestEvents[0]
        ? {
          latitude: latestEvents[0].latitude,
          longitude: latestEvents[0].longitude,
          location: latestEvents[0].location,
          eventDate: latestEvents[0].eventDate,
        }
        : null,
    };

    res.json(vesselInfo);
  } catch (error: any) {
    console.error('Get vessel tracking error:', error);
    res.status(500).json({ error: error.message || 'Failed to get vessel tracking' });
  }
});

/**
 * POST /api/v1/containers/:id/refresh-tracking
 * Force refresh tracking from external sources
 * @access ADMIN, OPERATOR
 */
router.post(
  '/containers/:id/refresh-tracking',
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
 * GET /api/v1/containers/:id/timeline
 * Get complete timeline for container (tracking events, modifications, notifications, documents)
 * @access All authenticated users (permission checked)
 */
router.get('/containers/:id/timeline', authMiddleware, async (req: Request, res: Response) => {
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
 * POST /api/v1/containers/:id/notify
 * Send manual notification to client about container
 * @access ADMIN, OPERATOR
 */
router.post(
  '/containers/:id/notify',
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

/**
 * GET /api/v1/tracking/external/:containerNumber
 * Look up container from external sources (SeaRates) without requiring it to be in system
 * @access All authenticated users
 */
router.get('/external/:containerNumber', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { containerNumber } = req.params;

    // Validate container number format (basic validation)
    const containerRegex = /^[A-Z]{4}\d{7}$/;
    if (!containerRegex.test(containerNumber.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid container number format. Expected: 4 letters + 7 digits (e.g., MSCU1234567)',
      });
    }

    // Check if SeaRates is configured
    if (!searatesIntegration.isConfigured()) {
      return res.status(503).json({
        error: 'External tracking service not configured',
        message: 'Please configure SEARATES_API_KEY in environment variables',
      });
    }

    // Try to get tracking from SeaRates
    const trackingData = await searatesIntegration.getContainerTracking(
      containerNumber.toUpperCase()
    );

    if (!trackingData) {
      return res.status(404).json({
        error: 'Container not found',
        message: `No tracking data found for container ${containerNumber}`,
        containerNumber: containerNumber.toUpperCase(),
      });
    }

    // Return the external tracking data
    res.json({
      source: 'SEARATES',
      containerNumber: trackingData.containerNumber,
      blNumber: trackingData.blNumber,
      shippingLine: trackingData.shippingLine,
      status: trackingData.status,
      location: trackingData.location,
      vessel: trackingData.vessel,
      voyage: trackingData.voyage,
      eta: trackingData.eta,
      ata: trackingData.ata,
      events: trackingData.events?.map((e) => ({
        type: searatesIntegration.mapEventType(e.type),
        date: e.occurredAt,
        location: e.location?.name || e.location,
        vessel: e.vessel?.name,
        description: e.description,
      })) || [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('External tracking lookup error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch external tracking data',
    });
  }
});

/**
 * GET /api/v1/tracking/bl/:blNumber
 * Look up container by Bill of Lading number
 * @access All authenticated users
 */
router.get('/bl/:blNumber', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { blNumber } = req.params;

    // Check if SeaRates is configured
    if (!searatesIntegration.isConfigured()) {
      return res.status(503).json({
        error: 'External tracking service not configured',
      });
    }

    // Try to get tracking from SeaRates by B/L
    const trackingData = await searatesIntegration.getContainerByBL(blNumber);

    if (!trackingData) {
      return res.status(404).json({
        error: 'Bill of Lading not found',
        message: `No tracking data found for B/L ${blNumber}`,
        blNumber,
      });
    }

    res.json({
      source: 'SEARATES',
      containerNumber: trackingData.containerNumber,
      blNumber: trackingData.blNumber,
      shippingLine: trackingData.shippingLine,
      status: trackingData.status,
      location: trackingData.location,
      vessel: trackingData.vessel,
      eta: trackingData.eta,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('B/L lookup error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch B/L tracking data',
    });
  }
});

/**
 * GET /api/tracking/public/:containerNumber
 * Public container tracking endpoint (no authentication required)
 * For customers to track containers without logging in
 * @access Public
 */
router.get('/public/:containerNumber', async (req: Request, res: Response) => {
  try {
    const { containerNumber } = req.params;
    const { sealine, route = 'true' } = req.query;

    // Validate container number format
    const containerRegex = /^[A-Z]{4}\d{7}$/;
    if (!containerRegex.test(containerNumber.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid container number format',
        message: 'Expected format: 4 letters + 7 digits (e.g., MSCU1234567)',
      });
    }

    // Check if SeaRates is configured
    if (!searatesIntegration.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Tracking service unavailable',
        message: 'Container tracking service is not configured',
      });
    }

    // Get tracking from SeaRates API v3
    const trackingData = await searatesIntegration.getContainerTracking(
      containerNumber.toUpperCase(),
      {
        sealine: sealine as string || 'auto',
        includeRoute: route === 'true',
        forceUpdate: false,
      }
    );

    if (!trackingData) {
      return res.status(404).json({
        success: false,
        error: 'Container not found',
        message: `No tracking data found for container ${containerNumber}`,
        containerNumber: containerNumber.toUpperCase(),
      });
    }

    // Return structured response
    res.json({
      success: true,
      source: 'SEARATES_V3',
      data: {
        containerNumber: trackingData.containerNumber,
        blNumber: trackingData.blNumber,
        bookingNumber: trackingData.bookingNumber,
        shippingLine: {
          code: trackingData.shippingLine,
          name: trackingData.shippingLineName,
        },
        status: trackingData.status,
        sizeType: trackingData.sizeType,
        isEmpty: trackingData.isEmpty,
        location: trackingData.location,
        vessel: trackingData.vessel,
        voyage: trackingData.voyage,
        eta: trackingData.eta,
        predictedEta: trackingData.predictedEta,
        ata: trackingData.ata,
        etd: trackingData.etd,
        atd: trackingData.atd,
        events: trackingData.events?.map(event => ({
          type: event.type,
          eventCode: event.eventCode,
          eventName: event.eventName,
          status: event.status,
          date: event.occurredAt,
          isActual: event.isActual,
          location: event.location,
          facility: event.facility,
          vessel: event.vessel,
          voyage: event.voyage,
        })) || [],
        route: trackingData.route,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Public tracking lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Tracking lookup failed',
      message: error.message || 'Failed to fetch tracking data',
    });
  }
});

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

// ============================================
// GPS TRACKING ROUTES (TrackGPS Integration)
// ============================================

/**
 * GET /api/tracking/gps/test-connection
 * Test TrackGPS API connection
 * @access ADMIN only
 */
router.get(
  '/gps/test-connection',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      if (!trackGPSService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'TrackGPS API is not configured',
          hint: 'Please set TRACKGPS_USERNAME and TRACKGPS_PASSWORD in environment variables',
        });
      }

      // Test authentication
      await trackGPSService.authenticate();

      // Try to get vehicles
      const vehicles = await trackGPSService.getVehicles();

      res.json({
        success: true,
        message: 'TrackGPS API connection successful',
        vehicleCount: vehicles.length,
        configured: true,
      });
    } catch (error: any) {
      console.error('TrackGPS connection test error:', error);
      res.status(500).json({
        success: false,
        message: 'Connection test failed',
        error: error.message,
        configured: trackGPSService.isConfigured(),
      });
    }
  }
);

/**
 * GET /api/tracking/gps/vehicles
 * Get list of all TrackGPS vehicles
 * @access ADMIN, AGENT
 */
router.get(
  '/gps/vehicles',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'AGENT']),
  async (req: Request, res: Response) => {
    try {
      if (!trackGPSService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'TrackGPS API is not configured',
        });
      }

      const vehicles = await trackGPSService.getVehicles();

      res.json({
        success: true,
        vehicles,
        count: vehicles.length,
      });
    } catch (error: any) {
      console.error('Get GPS vehicles error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch vehicles from TrackGPS',
      });
    }
  }
);

/**
 * GET /api/tracking/gps/vehicles/:vehicleId/location
 * Get current GPS location for a specific vehicle
 * @access ADMIN, OPERATOR, AGENT, CLIENT (if assigned to their booking)
 */
router.get(
  '/gps/vehicles/:vehicleId/location',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.params;
      const user = (req as any).user;

      // Check if TrackGPS is configured
      if (!trackGPSService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'TrackGPS API is not configured',
        });
      }

      // Check permissions for CLIENT role
      if (user.role === 'CLIENT') {
        // Verify this vehicle is assigned to one of their bookings
        const booking = await prisma.booking.findFirst({
          where: {
            clientId: user.clientId,
            trackingVehicleId: vehicleId,
          },
        });

        if (!booking) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Vehicle not assigned to your bookings',
          });
        }
      }

      // Get current position
      const location = await trackGPSService.getCurrentPosition(vehicleId);

      if (!location) {
        return res.status(404).json({
          success: false,
          error: 'No GPS data available for this vehicle',
        });
      }

      res.json({
        success: true,
        vehicleId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          course: location.course,
          timestamp: location.gpsDate,
        },
      });
    } catch (error: any) {
      console.error('Get vehicle location error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get vehicle location',
      });
    }
  }
);

/**
 * PUT /api/tracking/bookings/:bookingId/assign-vehicle
 * Assign a TrackGPS vehicle to a booking
 * @access ADMIN only
 */
router.put(
  '/bookings/:bookingId/assign-vehicle',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const { vehicleId } = req.body;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          error: 'vehicleId is required',
        });
      }

      // Get vehicle info from TrackGPS
      const vehicleInfo = await trackGPSService.getVehicleInfo(vehicleId);

      if (!vehicleInfo) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found in TrackGPS',
        });
      }

      // Update booking with vehicle assignment
      const booking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          trackingVehicleId: vehicleId,
          trackingVehicleName: vehicleInfo.name || vehicleInfo.plateNumber || vehicleId,
          trackingStartedAt: new Date(),
        },
        include: {
          client: {
            select: {
              companyName: true,
            },
          },
        },
      });

      // Get initial GPS location
      const location = await trackGPSService.getCurrentPosition(vehicleId);

      if (location) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            lastGpsLat: location.latitude,
            lastGpsLng: location.longitude,
            lastGpsSpeed: location.speed,
            lastGpsUpdate: new Date(location.gpsDate),
          },
        });
      }

      res.json({
        success: true,
        message: 'Vehicle assigned to booking successfully',
        booking: {
          id: booking.id,
          trackingVehicleId: booking.trackingVehicleId,
          trackingVehicleName: booking.trackingVehicleName,
          trackingStartedAt: booking.trackingStartedAt,
        },
        initialLocation: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          timestamp: location.gpsDate,
        } : null,
      });
    } catch (error: any) {
      console.error('Assign vehicle error:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to assign vehicle',
      });
    }
  }
);

/**
 * GET /api/tracking/bookings/:bookingId/gps-location
 * Get current GPS location for vehicle assigned to a booking
 * @access All authenticated users (filtered by role)
 */
router.get(
  '/bookings/:bookingId/gps-location',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;
      const user = (req as any).user;

      // Get booking with permission check
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
      }

      // Permission check
      if (user.role === 'CLIENT' && booking.clientId !== user.clientId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      if (user.role === 'AGENT' && booking.agentId !== user.agentId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Check if vehicle is assigned
      if (!booking.trackingVehicleId) {
        return res.status(404).json({
          success: false,
          error: 'No vehicle assigned to this booking',
        });
      }

      // Update GPS location from TrackGPS
      const result = await trackGPSService.updateBookingGPSLocation(bookingId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Failed to get GPS location',
        });
      }

      res.json({
        success: true,
        bookingId,
        vehicleId: booking.trackingVehicleId,
        vehicleName: booking.trackingVehicleName,
        location: result.location ? {
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          speed: result.location.speed,
          course: result.location.course,
          timestamp: result.location.gpsDate,
        } : null,
      });
    } catch (error: any) {
      console.error('Get booking GPS location error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get GPS location',
      });
    }
  }
);

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

export default router;
