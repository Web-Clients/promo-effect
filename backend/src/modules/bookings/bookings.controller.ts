import { Router, Request, Response } from 'express';
import { BookingsService } from './bookings.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
const bookingsService = new BookingsService();

/**
 * POST /api/bookings - Create new booking
 * Auth: Required
 * Role: Any authenticated user (CLIENT, AGENT, ADMIN, etc.)
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await bookingsService.create(req.body, req.user!.userId);
    res.status(201).json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/bookings - List all bookings (with filters)
 * Auth: Required
 * Role: Any authenticated user
 *
 * Query params:
 * - clientId (optional, admins only)
 * - status (optional): CONFIRMED, SENT, IN_TRANSIT, ARRIVED, DELIVERED, CANCELLED
 * - dateFrom (optional): ISO date string
 * - dateTo (optional): ISO date string
 * - search (optional): Search in booking ID, client name
 * - limit (optional, default: 50): Number of results
 * - offset (optional, default: 0): Pagination offset
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const filters = {
      clientId: req.query.clientId as string,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await bookingsService.findAll(filters, req.user!.userId, req.user!.role);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bookings';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/bookings/stats - Get booking statistics
 * Auth: Required
 * Role: Any authenticated user (clients see only their stats)
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await bookingsService.getStats(req.user!.userId, req.user!.role);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/bookings/:id - Get single booking by ID
 * Auth: Required
 * Role: Any authenticated user (clients can only view their own)
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await bookingsService.findOne(req.params.id, req.user!.userId, req.user!.role);
    res.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch booking';
    if (message.includes('Forbidden')) {
      res.status(403).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * PUT /api/bookings/:id - Update booking
 * Auth: Required
 * Role: ADMIN, MANAGER (for status updates), CLIENT (for own bookings, limited fields)
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await bookingsService.update(req.params.id, req.body, req.user!.userId, req.user!.role);
    res.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update booking';
    if (message.includes('Forbidden')) {
      res.status(403).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

/**
 * DELETE /api/bookings/:id - Cancel booking (soft delete)
 * Auth: Required
 * Role: ADMIN, SUPER_ADMIN only
 */
router.delete('/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const result = await bookingsService.delete(req.params.id, req.user!.userId, req.user!.role);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete booking';
    if (message.includes('Forbidden')) {
      res.status(403).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * POST /api/bookings/:id/documents - Upload document
 * Auth: Required
 * Role: ADMIN, AGENT, CLIENT (for own boookings)
 */
router.post('/:id/documents', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const document = await bookingsService.addDocument(
      req.params.id,
      req.file,
      req.user!.userId,
      req.user!.role
    );

    res.status(201).json(document);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload document';
    if (message.includes('Forbidden')) {
      res.status(403).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export default router;
