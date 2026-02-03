/**
 * Pricing Routes
 * API endpoints for pricing rules and calculations
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { pricingService, PricingCalculationParams, CreatePricingRuleDTO } from './pricing.service';

const router = Router();

/**
 * POST /api/v1/pricing/calculate
 * Calculate price based on parameters
 * @access Public (for landing page) or authenticated users
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const params: PricingCalculationParams = {
      containerType: req.body.containerType,
      portOrigin: req.body.portOrigin,
      portDestination: req.body.portDestination,
      shippingLine: req.body.shippingLine,
      quantity: req.body.quantity || 1,
      date: req.body.date ? new Date(req.body.date) : new Date(),
    };

    // Validation
    if (!params.containerType || !params.portOrigin || !params.portDestination) {
      return res.status(400).json({
        success: false,
        error: 'containerType, portOrigin, and portDestination are required',
      });
    }

    const result = await pricingService.calculatePrice(params);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Calculate price error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate price',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/pricing/rules
 * Get all pricing rules
 * @access ADMIN, MANAGER
 */
router.get('/rules', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      containerType: req.query.container_type as string,
      shippingLine: req.query.shipping_line as string,
    };

    const rules = await pricingService.getAllRules(filters);

    res.json({
      success: true,
      data: rules,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Get pricing rules error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pricing rules',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/pricing/rules/:id
 * Get pricing rule by ID
 * @access ADMIN, MANAGER
 */
router.get('/rules/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await pricingService.getRuleById(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Pricing rule not found',
      });
    }

    res.json({
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Get pricing rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pricing rule',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/pricing/rules
 * Create new pricing rule
 * @access ADMIN, SUPER_ADMIN
 */
router.post('/rules', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data: CreatePricingRuleDTO = {
      name: req.body.name,
      priority: req.body.priority,
      containerType: req.body.containerType,
      portOrigin: req.body.portOrigin,
      portDestination: req.body.portDestination,
      shippingLine: req.body.shippingLine,
      basePrice: req.body.basePrice,
      currency: req.body.currency,
      additionalTaxes: req.body.additionalTaxes,
      volumeDiscounts: req.body.volumeDiscounts,
      validFrom: new Date(req.body.validFrom),
      validTo: req.body.validTo ? new Date(req.body.validTo) : undefined,
      specialConditions: req.body.specialConditions,
      notes: req.body.notes,
    };

    // Validation
    if (!data.name || !data.basePrice || !data.validFrom) {
      return res.status(400).json({
        success: false,
        error: 'name, basePrice, and validFrom are required',
      });
    }

    const rule = await pricingService.createRule(data, user.userId);

    res.status(201).json({
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Create pricing rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create pricing rule',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/v1/pricing/rules/:id
 * Update pricing rule
 * @access ADMIN, SUPER_ADMIN
 */
router.put('/rules/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const data: Partial<CreatePricingRuleDTO> = {
      name: req.body.name,
      priority: req.body.priority,
      containerType: req.body.containerType,
      portOrigin: req.body.portOrigin,
      portDestination: req.body.portDestination,
      shippingLine: req.body.shippingLine,
      basePrice: req.body.basePrice,
      currency: req.body.currency,
      additionalTaxes: req.body.additionalTaxes,
      volumeDiscounts: req.body.volumeDiscounts,
      validFrom: req.body.validFrom ? new Date(req.body.validFrom) : undefined,
      validTo: req.body.validTo ? new Date(req.body.validTo) : undefined,
      specialConditions: req.body.specialConditions,
      notes: req.body.notes,
    };

    const rule = await pricingService.updateRule(id, data, user.userId);

    res.json({
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Update pricing rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update pricing rule',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/v1/pricing/rules/:id
 * Delete pricing rule (soft delete)
 * @access ADMIN, SUPER_ADMIN
 */
router.delete('/rules/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    await pricingService.deleteRule(id, user.userId);

    res.json({
      success: true,
      message: 'Pricing rule deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Delete pricing rule error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete pricing rule',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/pricing/history
 * Get price history/trends
 * @access ADMIN, MANAGER
 */
router.get('/history', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const params = {
      containerType: req.query.container_type as string,
      portOrigin: req.query.port_origin as string,
      portDestination: req.query.port_destination as string,
      shippingLine: req.query.shipping_line as string,
      dateFrom: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      dateTo: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
    };

    const history = await pricingService.getPriceHistory(params);

    res.json({
      success: true,
      data: history,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Get price history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get price history',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

