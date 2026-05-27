import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import trackingService from './tracking.service';
import { aisstreamIntegration } from '../../integrations/aisstream.integration';
import prisma from '../../lib/prisma';
import logger from '../../utils/logger';

const router = Router();

/**
 * GET /api/tracking/search/:containerNumber
 * Look up a container by number. Always served from local DB.
 * If the container has a vessel MMSI we merge in the latest cached
 * AIS position (free, in-memory, no API call).
 */
router.get('/:containerNumber', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { containerNumber } = req.params;
    const user = (req as any).user;

    const container = await trackingService.getContainerByNumber(
      containerNumber,
      user.role,
      user.clientId
    );

    const containerWithMmsi = container as any;
    if (containerWithMmsi.vesselMmsi) {
      const position = aisstreamIntegration.getPosition(containerWithMmsi.vesselMmsi);
      if (position) {
        (container as any).livePosition = {
          latitude: position.latitude,
          longitude: position.longitude,
          sog: position.sog,
          cog: position.cog,
          heading: position.heading >= 511 ? null : position.heading,
          shipName: position.shipName,
          destination: position.destination,
          timestamp: position.timestamp,
        };
      }
    }

    return res.json(container);
  } catch (error: any) {
    logger.error('Search container error:', error);
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
 * GET /api/tracking/bl/:blNumber
 * Look up a container by Bill of Lading number.
 */
router.get('/bl/:blNumber', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { blNumber } = req.params;

    const container = await prisma.container.findFirst({
      where: { blNumber } as any,
      include: {
        booking: true,
        trackingEvents: { orderBy: { eventDate: 'desc' }, take: 20 },
      },
    });

    if (!container) {
      return res.status(404).json({
        error: 'Bill of Lading not found',
        blNumber,
      });
    }

    const containerWithMmsi = container as any;
    let livePosition = null;
    if (containerWithMmsi.vesselMmsi) {
      const position = aisstreamIntegration.getPosition(containerWithMmsi.vesselMmsi);
      if (position) {
        livePosition = {
          latitude: position.latitude,
          longitude: position.longitude,
          sog: position.sog,
          cog: position.cog,
          heading: position.heading >= 511 ? null : position.heading,
          shipName: position.shipName,
          timestamp: position.timestamp,
        };
      }
    }

    res.json({
      source: 'LOCAL_DB',
      containerNumber: container.containerNumber,
      blNumber: container.blNumber,
      status: container.currentStatus,
      location: container.currentLocation,
      vessel: {
        mmsi: containerWithMmsi.vesselMmsi,
        name: containerWithMmsi.vesselName,
        imo: containerWithMmsi.vesselImo,
      },
      livePosition,
      eta: container.eta,
      events: container.trackingEvents,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('B/L lookup error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch B/L tracking data' });
  }
});

/**
 * GET /api/tracking/public/:containerNumber
 * Public container tracking endpoint (no authentication).
 * Returns DB state + the latest cached AIS position for the assigned vessel.
 */
router.get('/public/:containerNumber', async (req: Request, res: Response) => {
  try {
    const { containerNumber } = req.params;

    const container = await prisma.container.findUnique({
      where: { containerNumber: containerNumber.toUpperCase() },
      include: {
        trackingEvents: { orderBy: { eventDate: 'desc' }, take: 50 },
      },
    });

    if (!container) {
      return res.status(404).json({
        success: false,
        error: 'Container not found',
        containerNumber: containerNumber.toUpperCase(),
      });
    }

    const containerWithMmsi = container as any;
    let livePosition = null;
    if (containerWithMmsi.vesselMmsi) {
      const position = aisstreamIntegration.getPosition(containerWithMmsi.vesselMmsi);
      if (position) {
        livePosition = {
          latitude: position.latitude,
          longitude: position.longitude,
          sog: position.sog,
          cog: position.cog,
          heading: position.heading >= 511 ? null : position.heading,
          shipName: position.shipName,
          destination: position.destination,
          timestamp: position.timestamp,
        };
      }
    }

    res.json({
      success: true,
      source: 'AISSTREAM',
      data: {
        containerNumber: container.containerNumber,
        blNumber: container.blNumber,
        status: container.currentStatus,
        currentLocation: {
          name: container.currentLocation,
          latitude: container.currentLat,
          longitude: container.currentLng,
        },
        vessel: {
          mmsi: containerWithMmsi.vesselMmsi,
          name: containerWithMmsi.vesselName,
          imo: containerWithMmsi.vesselImo,
        },
        livePosition,
        eta: container.eta,
        events: container.trackingEvents.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          eventDate: e.eventDate,
          location: e.location,
          portName: e.portName,
          vessel: e.vessel,
          latitude: e.latitude,
          longitude: e.longitude,
          source: e.source,
        })),
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Public tracking lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Tracking lookup failed',
      message: error.message || 'Failed to fetch tracking data',
    });
  }
});

/**
 * GET /api/tracking/vessel/:mmsi
 * Look up a vessel + all linked containers by MMSI.
 * Includes the latest cached AIS position if available.
 */
router.get('/vessel/:mmsi', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { mmsi } = req.params;

    const containers = await prisma.container.findMany({
      where: { vesselMmsi: mmsi } as any,
      include: {
        booking: {
          include: { client: { select: { id: true, companyName: true } } },
        },
      },
    });

    const position = aisstreamIntegration.getPosition(mmsi);

    const firstContainer = containers[0] as any;
    res.json({
      mmsi,
      vesselName: position?.shipName || firstContainer?.vesselName || null,
      imo: position?.imo || firstContainer?.vesselImo || null,
      livePosition: position
        ? {
            latitude: position.latitude,
            longitude: position.longitude,
            sog: position.sog,
            cog: position.cog,
            heading: position.heading >= 511 ? null : position.heading,
            destination: position.destination,
            timestamp: position.timestamp,
          }
        : null,
      containers: containers.map((c) => ({
        id: c.id,
        containerNumber: c.containerNumber,
        client: c.booking.client.companyName,
        currentStatus: c.currentStatus,
        eta: c.eta,
      })),
    });
  } catch (error: any) {
    logger.error('Get vessel tracking error:', error);
    res.status(500).json({ error: error.message || 'Failed to get vessel tracking' });
  }
});

/**
 * GET /api/tracking/positions/live
 * Returns every cached AIS position currently in memory.
 * Used by the admin map view to render all known vessels at once.
 */
router.get('/positions/live', authMiddleware, async (_req: Request, res: Response) => {
  res.json({
    count: aisstreamIntegration.getAllPositions().length,
    positions: aisstreamIntegration.getAllPositions(),
    fetchedAt: new Date().toISOString(),
  });
});

/**
 * GET /api/tracking/vessel-directory/search?q=<name>
 * Autocomplete over the AISStream-populated vessel directory.
 * Used by the operator UI when assigning a vessel to a container
 * and the automatic resolver couldn't find a match.
 */
router.get('/vessel-directory/search', authMiddleware, async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q || q.length < 2) {
    return res.json({ results: [] });
  }

  const needle = q.toUpperCase();
  const results = await prisma.vesselDirectory.findMany({
    where: {
      OR: [{ name: { contains: needle, mode: 'insensitive' } }, { imo: needle }, { mmsi: needle }],
    },
    orderBy: { lastSeen: 'desc' },
    take: 12,
    select: {
      mmsi: true,
      name: true,
      imo: true,
      shipType: true,
      destination: true,
      lastSeen: true,
    },
  });

  res.json({ results });
});

export default router;
