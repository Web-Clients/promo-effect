/**
 * Suppliers Router
 * REST API endpoints for reusable supplier (furnizor) management.
 * Suppliers = Chinese exporters; distinct from Client (Moldovan/Romanian beneficiar).
 */

import { Router, Request, Response } from 'express';
import { suppliersService } from './suppliers.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/v1/suppliers — list all suppliers (alphabetical)
 * Query: search, country, page, limit
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string | undefined,
      country: req.query.country as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: Math.min(req.query.limit ? parseInt(req.query.limit as string) : 50, 200),
    };
    const result = await suppliersService.list(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/suppliers — create new supplier
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, address, contact, phone, email, website, country, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const supplier = await suppliersService.create({
      name: name.trim(),
      address,
      contact,
      phone,
      email,
      website,
      country,
      notes,
    });
    res.status(201).json(supplier);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Supplier with this name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/suppliers/:id — single supplier
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const supplier = await suppliersService.findById(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/v1/suppliers/:id — update supplier
 */
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const supplier = await suppliersService.update(req.params.id, req.body);
    res.json(supplier);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Supplier not found' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v1/suppliers/:id — admin only; unlinks bookings first
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await suppliersService.delete(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Supplier not found' });
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
