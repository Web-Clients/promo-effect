import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import prisma from '../../lib/prisma';
import trackGPSService from '../../services/trackgps.service';

const router = Router();

// ============================================
// GPS TRACKING ROUTES (TrackGPS Integration)
// ============================================

/**
 * GET /api/tracking/gps/test-connection
 * Test TrackGPS API connection
 * @access ADMIN only
 */
router.get(
  '/test-connection',
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
  '/vehicles',
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
router.get('/vehicles/:vehicleId/location', authMiddleware, async (req: Request, res: Response) => {
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
});

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
        initialLocation: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              speed: location.speed,
              timestamp: location.gpsDate,
            }
          : null,
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
        location: result.location
          ? {
              latitude: result.location.latitude,
              longitude: result.location.longitude,
              speed: result.location.speed,
              course: result.location.course,
              timestamp: result.location.gpsDate,
            }
          : null,
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

export default router;
