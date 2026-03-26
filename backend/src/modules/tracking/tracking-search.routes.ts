import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import trackingService from './tracking.service';
import { searatesIntegration } from '../../integrations/searates.integration';
import prisma from '../../lib/prisma';

const router = Router();

/**
 * GET /api/tracking/search/:containerNumber
 * Search container by number
 * @access All authenticated users (permission checked)
 */
router.get('/:containerNumber', authMiddleware, async (req: Request, res: Response) => {
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
      const needsRefresh =
        !container.currentStatus ||
        !container.lastSyncAt ||
        new Date().getTime() - new Date(container.lastSyncAt).getTime() > 4 * 60 * 60 * 1000;

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
        console.log(
          `[Tracking] Container ${containerNumber} not found locally, trying SeaRates API...`
        );

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
            trackingEvents:
              searatesData.events?.map((event, index) => ({
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
 * GET /api/tracking/external/:containerNumber
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
        error:
          'Invalid container number format. Expected: 4 letters + 7 digits (e.g., MSCU1234567)',
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
      events:
        trackingData.events?.map((e) => ({
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
 * GET /api/tracking/bl/:blNumber
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
        sealine: (sealine as string) || 'auto',
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
        events:
          trackingData.events?.map((event) => ({
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
 * GET /api/tracking/vessel/:vesselName
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

export default router;
