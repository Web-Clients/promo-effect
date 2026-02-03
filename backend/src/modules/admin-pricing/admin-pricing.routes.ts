/**
 * Admin Pricing Routes
 * API endpoints for managing base prices, port adjustments, and admin settings
 * Protected by admin role
 */

import { Router, Request, Response } from 'express';
import { adminPricingService } from './admin-pricing.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Middleware to check admin role
const adminOnly = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

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
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update base price';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/admin-pricing/base-prices/:id
 * Delete base price
 */
router.delete('/base-prices/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await adminPricingService.deleteBasePrice(req.params.id);
    res.json({ message: 'Base price deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete base price';
    res.status(400).json({ error: message });
  }
});

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
router.get('/port-adjustments/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
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
});

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
router.put('/port-adjustments/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const portAdjustment = await adminPricingService.updatePortAdjustment(req.params.id, req.body);
    res.json(portAdjustment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update port adjustment';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/admin-pricing/port-adjustments/:id
 * Delete port adjustment
 */
router.delete('/port-adjustments/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await adminPricingService.deletePortAdjustment(req.params.id);
    res.json({ message: 'Port adjustment deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete port adjustment';
    res.status(400).json({ error: message });
  }
});

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
    res.json(settings);
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

export default router;
