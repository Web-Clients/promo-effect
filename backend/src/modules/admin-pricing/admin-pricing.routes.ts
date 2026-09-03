/**
 * Admin Pricing Routes
 * API endpoints for managing base prices, port adjustments, and admin settings
 * Protected by admin role
 */

import { Router, Request, Response } from 'express';
import { adminPricingService } from './admin-pricing.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import notificationService from '../../services/notification.service';
import prisma from '../../lib/prisma';
import logger from '../../utils/logger';

// Explicit role guard for admin-pricing routes (B14)
const adminOnly = requireRole(['ADMIN', 'SUPER_ADMIN']);

const router = Router();

// ============================================
// BASE PRICES ENDPOINTS
// ============================================

/**
 * GET /api/admin-pricing/base-prices
 * Get all base prices with optional filters
 */
router.get('/base-prices', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const filters = {
      shippingLine: req.query.shippingLine as string,
      portOrigin: req.query.portOrigin as string,
      portDestination: req.query.portDestination as string,
      containerType: req.query.containerType as string,
      isActive:
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    };

    const basePrices = await adminPricingService.getAllBasePrices(filters);
    res.json({ basePrices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get base prices';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin-pricing/base-prices/:id
 * Get base price by ID
 */
router.get('/base-prices/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const basePrice = await adminPricingService.getBasePriceById(req.params.id);
    if (!basePrice) {
      return res.status(404).json({ error: 'Base price not found' });
    }
    res.json(basePrice);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get base price';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin-pricing/base-prices
 * Create new base price
 */
router.post('/base-prices', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const data = {
      ...req.body,
      validFrom: new Date(req.body.validFrom),
      validUntil: new Date(req.body.validUntil),
    };
    const basePrice = await adminPricingService.createBasePrice(data, userId);
    res.status(201).json(basePrice);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create base price';
    res.status(400).json({ error: message });
  }
});

/**
 * PUT /api/admin-pricing/base-prices/:id
 * Update base price
 */
router.put('/base-prices/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      ...(req.body.validFrom && { validFrom: new Date(req.body.validFrom) }),
      ...(req.body.validUntil && { validUntil: new Date(req.body.validUntil) }),
    };
    const basePrice = await adminPricingService.updateBasePrice(req.params.id, data);
    res.json(basePrice);

    // Fire PRICE_CHANGED notification for all admins/operators (non-blocking)
    setImmediate(async () => {
      try {
        const currentUser = (req as any).user;
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'] } },
        });
        const label = `${basePrice.shippingLine} ${basePrice.portOrigin}→${basePrice.portDestination} ${basePrice.containerType}`;
        for (const admin of admins) {
          if (admin.id === currentUser?.userId) continue; // don't notify yourself
          await notificationService.sendNotification({
            userId: admin.id,
            type: 'PRICE_CHANGED',
            title: `Preț actualizat: ${label}`,
            message: `Prețul de bază pentru ruta ${label} a fost actualizat la $${basePrice.basePrice} (valid ${new Date(basePrice.validFrom).toLocaleDateString('ro-RO')}–${new Date(basePrice.validUntil).toLocaleDateString('ro-RO')}).`,
            channels: { email: false, push: true, sms: false, whatsapp: false },
          });
        }
      } catch (notifErr) {
        logger.error('[AdminPricing] Failed to send PRICE_CHANGED notification:', notifErr);
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update base price';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/admin-pricing/base-prices/:id
 * Delete base price
 */
router.delete(
  '/base-prices/:id',
  authMiddleware,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      await adminPricingService.deleteBasePrice(req.params.id);
      res.json({ message: 'Base price deleted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete base price';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/admin-pricing/base-prices/bulk
 * Bulk create base prices
 */
router.post('/base-prices/bulk', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const prices = req.body.prices.map((p: any) => ({
      ...p,
      validFrom: new Date(p.validFrom),
      validUntil: new Date(p.validUntil),
    }));
    const results = await adminPricingService.bulkCreateBasePrices(prices, userId);
    res.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk create base prices';
    res.status(400).json({ error: message });
  }
});

// ============================================
// FILTER OPTIONS ENDPOINTS
// ============================================

/**
 * GET /api/admin-pricing/shipping-lines
 * Get unique shipping lines for filter dropdown
 */
router.get('/shipping-lines', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const shippingLines = await adminPricingService.getShippingLines();
    res.json({ shippingLines });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get shipping lines';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin-pricing/origin-ports
 * Get unique origin ports for filter dropdown
 */
router.get('/origin-ports', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const originPorts = await adminPricingService.getOriginPorts();
    res.json({ originPorts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get origin ports';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin-pricing/container-types
 * Get unique container types for filter dropdown
 */
/**
 * GET /api/admin-pricing/container-types
 * Get unique container types for filter dropdown
 */
router.get('/container-types', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const containerTypes = await adminPricingService.getContainerTypes();
    res.json({ containerTypes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get container types';
    res.status(500).json({ error: message });
  }
});

// ============================================
// PORT ADJUSTMENTS ENDPOINTS
// ============================================

/**
 * GET /api/admin-pricing/port-adjustments
 * Get all port adjustments
 */
router.get('/port-adjustments', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const portAdjustments = await adminPricingService.getAllPortAdjustments();
    res.json({ portAdjustments });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get port adjustments';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin-pricing/port-adjustments/:id
 * Get port adjustment by ID
 */
router.get(
  '/port-adjustments/:id',
  authMiddleware,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const portAdjustment = await adminPricingService.getPortAdjustmentById(req.params.id);
      if (!portAdjustment) {
        return res.status(404).json({ error: 'Port adjustment not found' });
      }
      res.json(portAdjustment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get port adjustment';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST /api/admin-pricing/port-adjustments
 * Create port adjustment
 */
router.post('/port-adjustments', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const portAdjustment = await adminPricingService.createPortAdjustment(req.body);
    res.status(201).json(portAdjustment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create port adjustment';
    res.status(400).json({ error: message });
  }
});

/**
 * PUT /api/admin-pricing/port-adjustments/:id
 * Update port adjustment
 */
router.put(
  '/port-adjustments/:id',
  authMiddleware,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const portAdjustment = await adminPricingService.updatePortAdjustment(
        req.params.id,
        req.body
      );
      res.json(portAdjustment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update port adjustment';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * DELETE /api/admin-pricing/port-adjustments/:id
 * Delete port adjustment
 */
router.delete(
  '/port-adjustments/:id',
  authMiddleware,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      await adminPricingService.deletePortAdjustment(req.params.id);
      res.json({ message: 'Port adjustment deleted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete port adjustment';
      res.status(400).json({ error: message });
    }
  }
);

// ============================================
// PORT PRICING MATRIX ENDPOINTS
// ============================================

/**
 * GET /api/admin-pricing/port-matrix
 * Returns all rows from port_pricing_matrix
 */
router.get('/port-matrix', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const rows = await prisma.portPricingMatrix.findMany({
      orderBy: [{ portName: 'asc' }, { containerType: 'asc' }],
    });
    res.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get port matrix';
    res.status(500).json({ error: message });
  }
});

/**
 * PATCH /api/admin-pricing/port-matrix/:portName/:containerType
 * Upsert a single cell in the matrix
 */
router.patch(
  '/port-matrix/:portName/:containerType',
  authMiddleware,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const portName = decodeURIComponent(req.params.portName);
      const containerType = decodeURIComponent(req.params.containerType);
      const adjustment = parseFloat(req.body.adjustment);
      if (isNaN(adjustment)) {
        return res.status(400).json({ error: 'adjustment must be a number' });
      }
      const row = await prisma.portPricingMatrix.upsert({
        where: { portName_containerType: { portName, containerType } },
        update: { adjustment },
        create: { portName, containerType, adjustment },
      });
      res.json(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update cell';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * DELETE /api/admin-pricing/port-matrix/:portName
 * Delete all rows for a given port
 */
router.delete(
  '/port-matrix/:portName',
  authMiddleware,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const portName = decodeURIComponent(req.params.portName);
      await prisma.portPricingMatrix.deleteMany({ where: { portName } });
      res.json({ message: `Port "${portName}" deleted from matrix` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete port';
      res.status(400).json({ error: message });
    }
  }
);

// ============================================
// ADMIN SETTINGS ENDPOINTS
// ============================================

/**
 * GET /api/admin-pricing/settings
 * Get admin settings
 */
router.get('/settings', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const settings = await adminPricingService.getAdminSettings();
    // Hand back the RESOLVED percentages, not the raw JSON string, so the admin
    // screen always renders all four incoterms even before anything is stored.
    res.json({
      ...settings,
      commissionPercentByIncoterm: await adminPricingService.getCommissionPercentages(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get admin settings';
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/admin-pricing/settings
 * Update admin settings
 */
router.put('/settings', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const settings = await adminPricingService.updateAdminSettings(req.body);
    res.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update admin settings';
    res.status(400).json({ error: message });
  }
});

// ============================================
// STATISTICS ENDPOINT
// ============================================

/**
 * GET /api/admin-pricing/stats
 * Get pricing statistics for dashboard
 */
router.get('/stats', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const stats = await adminPricingService.getPricingStats();
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get pricing stats';
    res.status(500).json({ error: message });
  }
});

// ============================================
// LAND TRANSPORT RATES ENDPOINTS
// ============================================

/**
 * GET /api/admin-pricing/land-rates
 * Returns all land transport rates, optionally filtered by direction (IMPORT|EXPORT).
 * Response groups rows by city for matrix rendering.
 */
router.get('/land-rates', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { direction } = req.query;
    const where: Record<string, unknown> = { active: true };
    if (direction === 'IMPORT' || direction === 'EXPORT') {
      where.direction = direction;
    }
    const rows = await prisma.landTransportRate.findMany({
      where,
      orderBy: [{ direction: 'asc' }, { city: 'asc' }, { weightMin: 'asc' }],
    });
    res.json({ rows, total: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get land rates';
    res.status(500).json({ error: message });
  }
});

/**
 * PATCH /api/admin-pricing/land-rates/:id
 * Update priceUSD on a single cell.
 */
router.patch('/land-rates/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { priceUSD, notes, active } = req.body;
    const update: Record<string, unknown> = {};
    if (priceUSD !== undefined) {
      const p = parseFloat(priceUSD);
      if (isNaN(p)) return res.status(400).json({ error: 'priceUSD must be a number' });
      update.priceUSD = p;
    }
    if (notes !== undefined) update.notes = notes;
    if (active !== undefined) update.active = Boolean(active);
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }
    const row = await prisma.landTransportRate.update({
      where: { id: req.params.id },
      data: update,
    });
    res.json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update land rate';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/admin-pricing/land-rates
 * Add a new city/weight/direction row (or upsert).
 */
router.post('/land-rates', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { direction, city, weightMin, weightMax, weightLabel, priceUSD, notes } = req.body;
    if (
      !direction ||
      !city ||
      weightMin === undefined ||
      weightMax === undefined ||
      !weightLabel ||
      priceUSD === undefined
    ) {
      return res
        .status(400)
        .json({
          error: 'direction, city, weightMin, weightMax, weightLabel, priceUSD are required',
        });
    }
    const row = await prisma.landTransportRate.upsert({
      where: {
        direction_city_weightMin_weightMax: {
          direction,
          city,
          weightMin: parseFloat(weightMin),
          weightMax: parseFloat(weightMax),
        },
      },
      update: { priceUSD: parseFloat(priceUSD), weightLabel, notes: notes ?? null, active: true },
      create: {
        direction,
        city,
        weightMin: parseFloat(weightMin),
        weightMax: parseFloat(weightMax),
        weightLabel,
        priceUSD: parseFloat(priceUSD),
        notes: notes ?? null,
        active: true,
      },
    });
    res.status(201).json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create land rate';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/admin-pricing/land-rates/:id
 * Hard-delete a single rate row.
 */
router.delete('/land-rates/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await prisma.landTransportRate.delete({ where: { id: req.params.id } });
    res.json({ message: 'Land transport rate deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete land rate';
    res.status(400).json({ error: message });
  }
});

export default router;
