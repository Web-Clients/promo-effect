/**
 * Ports Routes
 * API endpoints for managing shipping ports
 */

import { Router, Request, Response } from 'express';
import portsService, { PortType } from './ports.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/ports
 * Get all ports (public - for dropdowns)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, includeInactive } = req.query;
    const ports = await portsService.getAll(
      type as PortType | undefined,
      includeInactive === 'true'
    );
    res.json(ports);
  } catch (error: any) {
    console.error('[Ports] Error fetching ports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ports/origin
 * Get origin ports only
 */
router.get('/origin', async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const ports = await portsService.getOriginPorts(includeInactive === 'true');
    res.json(ports);
  } catch (error: any) {
    console.error('[Ports] Error fetching origin ports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ports/destination
 * Get destination ports only
 */
router.get('/destination', async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const ports = await portsService.getDestinationPorts(includeInactive === 'true');
    res.json(ports);
  } catch (error: any) {
    console.error('[Ports] Error fetching destination ports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ports/:id
 * Get a single port by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const port = await portsService.getById(req.params.id);
    if (!port) {
      return res.status(404).json({ error: 'Port not found' });
    }
    res.json(port);
  } catch (error: any) {
    console.error('[Ports] Error fetching port:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin-only routes below
router.use(authMiddleware);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * POST /api/ports
 * Create a new port (admin only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, code, country, type } = req.body;

    if (!name || !country || !type) {
      return res.status(400).json({ error: 'Name, country, and type are required' });
    }

    if (!['ORIGIN', 'DESTINATION'].includes(type)) {
      return res.status(400).json({ error: 'Type must be ORIGIN or DESTINATION' });
    }

    const port = await portsService.create({ name, code, country, type });
    res.status(201).json(port);
  } catch (error: any) {
    console.error('[Ports] Error creating port:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/ports/:id
 * Update a port (admin only)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, code, country, isActive } = req.body;
    const port = await portsService.update(req.params.id, { name, code, country, isActive });
    res.json(port);
  } catch (error: any) {
    console.error('[Ports] Error updating port:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/ports/:id
 * Delete a port (admin only, soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await portsService.delete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Ports] Error deleting port:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/ports/seed
 * Seed initial ports data (admin only)
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const result = await portsService.seedPorts();
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Ports] Error seeding ports:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
