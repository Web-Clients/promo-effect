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
 * GET /api/tracking/fleet/live
 * Returns every container that has a vessel MMSI assigned, with:
 *   - the latest cached AIS position (if vessel is currently transmitting)
 *   - the persisted last-known position from the container row
 *   - full booking + client + tracking summary for the map popup
 *
 * Used by the FleetMap admin view to render all client containers
 * on a single live map.
 */
router.get('/fleet/live', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const { geocodePort } = await import('../../services/port-geocoder.service');

    // Pull every active container — not just those with an MMSI — so the
    // map shows the operator's full inventory at a glance. Containers
    // without AIS still get a position via current_lat/lng, then via
    // port geocoding of the most recent tracking event location, then
    // via booking port destination/origin.
    const containers = await prisma.container.findMany({
      where: {
        OR: [{ currentStatus: { notIn: ['DELIVERED', 'CANCELLED'] } }, { currentStatus: null }],
      },
      include: {
        booking: {
          select: {
            id: true,
            portOrigin: true,
            portDestination: true,
            client: { select: { id: true, companyName: true } },
          },
        },
        trackingEvents: {
          orderBy: { eventDate: 'desc' },
          take: 1,
          select: {
            eventType: true,
            eventDate: true,
            location: true,
            portName: true,
            unlocode: true,
            vessel: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      take: 500,
    });

    const fleet = containers.map((c) => {
      const cAny = c as any;
      const live = cAny.vesselMmsi ? aisstreamIntegration.getPosition(cAny.vesselMmsi) : null;
      const lastEvent = c.trackingEvents[0];

      let position: any = null;
      if (live) {
        position = {
          latitude: live.latitude,
          longitude: live.longitude,
          sog: live.sog,
          cog: live.cog,
          heading: live.heading >= 511 ? null : live.heading,
          destination: live.destination,
          timestamp: live.timestamp,
          source: 'AIS_LIVE',
        };
      } else if (c.currentLat != null && c.currentLng != null) {
        position = {
          latitude: c.currentLat,
          longitude: c.currentLng,
          sog: null,
          cog: null,
          heading: null,
          destination: null,
          timestamp: cAny.vesselPosAt || c.lastSyncAt,
          source: 'LAST_KNOWN',
        };
      } else if (lastEvent?.latitude != null && lastEvent?.longitude != null) {
        position = {
          latitude: lastEvent.latitude,
          longitude: lastEvent.longitude,
          sog: null,
          cog: null,
          heading: null,
          destination: null,
          timestamp: lastEvent.eventDate,
          source: 'LAST_EVENT',
        };
      } else {
        // Port fallback chain: last event unlocode/port → booking destination → origin
        const portCandidates = [
          lastEvent?.unlocode,
          lastEvent?.portName,
          lastEvent?.location,
          c.booking?.portDestination,
          c.booking?.portOrigin,
        ];
        for (const candidate of portCandidates) {
          const geo = geocodePort(candidate);
          if (geo) {
            position = {
              latitude: geo.lat,
              longitude: geo.lng,
              sog: null,
              cog: null,
              heading: null,
              destination: null,
              timestamp: lastEvent?.eventDate || c.updatedAt,
              source: 'PORT_FALLBACK',
              portName: geo.name,
            };
            break;
          }
        }
      }

      return {
        containerId: c.id,
        containerNumber: c.containerNumber,
        blNumber: c.blNumber,
        currentStatus: c.currentStatus,
        eta: c.eta,
        vessel: {
          mmsi: cAny.vesselMmsi || null,
          name: cAny.vesselName || live?.shipName || lastEvent?.vessel,
          imo: cAny.vesselImo || live?.imo || null,
        },
        position,
        booking: c.booking
          ? {
              id: c.booking.id,
              client: c.booking.client?.companyName,
              origin: c.booking.portOrigin,
              destination: c.booking.portDestination,
            }
          : null,
        lastEvent: lastEvent
          ? {
              eventType: lastEvent.eventType,
              eventDate: lastEvent.eventDate,
              location: lastEvent.location,
            }
          : null,
      };
    });

    // Background visualization: every cached AIS position we know about
    // in the trade-route bbox. Capped at AMBIENT_MAX to keep the
    // response payload bounded — at 5s poll the network cost matters.
    const AMBIENT_MAX = 1500;
    const allCached = aisstreamIntegration.getAllPositions();
    const sortedRecent = allCached.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const allPositions = sortedRecent.slice(0, AMBIENT_MAX).map((p) => ({
      mmsi: p.mmsi,
      name: p.shipName,
      lat: p.latitude,
      lng: p.longitude,
      cog: p.cog,
      heading: p.heading >= 511 ? null : p.heading,
      sog: p.sog,
    }));

    res.json({
      fleet,
      ambient: allPositions, // background ships moving live
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Fleet live error:', err);
    res.status(500).json({ error: err.message || 'Failed to load fleet' });
  }
});

/**
 * GET /api/tracking/aisstream/health
 * Operations endpoint — exposes the AISStream integration's internal
 * state for monitoring and debugging (WebSocket state, cache size,
 * last-message timestamp, total messages received).
 * Status:
 *   - ok        — WS open + last message <5 min ago
 *   - degraded  — WS closed or stale
 *   - off       — AISSTREAM_API_KEY not configured
 */
router.get('/aisstream/health', authMiddleware, async (_req: Request, res: Response) => {
  const h = aisstreamIntegration.health();
  const httpCode = h.status === 'ok' ? 200 : h.status === 'degraded' ? 503 : 404;
  res.status(httpCode).json({
    ...h,
    directorySize: await prisma.vesselDirectory.count().catch(() => 0),
    checkedAt: new Date().toISOString(),
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
