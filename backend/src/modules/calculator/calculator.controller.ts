/**
 * Calculator Controller
 * REST endpoints for price calculation
 */

import { Router, Request, Response } from 'express';
import { CalculatorService } from './calculator.service';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const calculatorService = new CalculatorService();

/**
 * POST /api/calculator/calculate
 * Calculate shipping prices for all shipping lines
 * Returns top 5 offers sorted by price
 *
 * Body:
 * {
 *   portOrigin: string,
 *   portDestination?: string,  // Default: Constanta
 *   containerType: string,
 *   cargoCategory: string,
 *   cargoWeight: string,
 *   cargoReadyDate: string     // ISO date
 * }
 */
router.post(
  '/calculate',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await calculatorService.calculatePrices(req.body);
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to calculate prices';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * GET /api/calculator/ports
 * Get list of available origin ports (for dropdown)
 */
router.get('/ports', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ports = await calculatorService.getAvailablePorts();
    res.json({ ports });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to get ports';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/calculator/container-types
 * Get list of available container types (for dropdown)
 */
router.get(
  '/container-types',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const types = await calculatorService.getAvailableContainerTypes();
      res.json({ containerTypes: types });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get container types';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/calculator/weight-ranges
 * Get list of available weight ranges (for dropdown)
 */
router.get(
  '/weight-ranges',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const weights = await calculatorService.getAvailableWeightRanges();
      res.json({ weightRanges: weights });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get weight ranges';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/calculator/destinations
 * Get list of available destination ports (for dropdown)
 */
router.get(
  '/destinations',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const destinations = await calculatorService.getAvailableDestinations();
      res.json({ destinations });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get destinations';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/calculator/shipping-lines
 * Get list of available shipping lines
 */
router.get(
  '/shipping-lines',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const shippingLines = await calculatorService.getAvailableShippingLines();
      res.json({ shippingLines });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get shipping lines';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST /api/calculator/place-order
 * Place order with selected offer
 * Creates booking and sends 3 emails: supplier, agent, customer
 *
 * Body:
 * {
 *   offerId: string,
 *   offer: PriceOffer,
 *   calculatorInput: CalculatorInput,
 *   supplierData: SupplierData
 * }
 */
router.post(
  '/place-order',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await calculatorService.placeOrder(req.body, userId);
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to place order';
      res.status(400).json({ error: message });
    }
  }
);

export default router;
