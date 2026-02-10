/**
 * Shipping Lines Routes
 * API endpoints for managing shipping line containers (local taxes)
 * and transport rates
 */

import { Router, Request, Response } from 'express';
import { shippingLinesService } from './shipping-lines.service';
import { authMiddleware, requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

// ============================================
// SHIPPING LINE CONTAINERS (Local Taxes)
// ============================================

router.get('/containers', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const filters = {
      shippingLine: req.query.shippingLine as string,
      containerType: req.query.containerType as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    };
    const items = await shippingLinesService.getAllShippingLineContainers(filters);
    res.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get shipping line containers';
    res.status(500).json({ error: message });
  }
});

router.get('/containers/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await shippingLinesService.getShippingLineContainerById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get item';
    res.status(500).json({ error: message });
  }
});

router.post('/containers', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await shippingLinesService.createShippingLineContainer(req.body);
    res.status(201).json(item);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Această combinație linie + container există deja' });
    }
    const message = error instanceof Error ? error.message : 'Failed to create';
    res.status(500).json({ error: message });
  }
});

router.put('/containers/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await shippingLinesService.updateShippingLineContainer(req.params.id, req.body);
    res.json(item);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Această combinație linie + container există deja' });
    }
    const message = error instanceof Error ? error.message : 'Failed to update';
    res.status(500).json({ error: message });
  }
});

router.delete('/containers/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    await shippingLinesService.deleteShippingLineContainer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete';
    res.status(500).json({ error: message });
  }
});

router.post('/containers/bulk', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const results = await shippingLinesService.bulkUpsert(req.body.items);
    res.json({ items: results, count: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk upsert';
    res.status(500).json({ error: message });
  }
});

router.get('/distinct-lines', authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const lines = await shippingLinesService.getDistinctShippingLines();
    res.json({ lines });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get lines';
    res.status(500).json({ error: message });
  }
});

router.get('/distinct-container-types', authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const types = await shippingLinesService.getDistinctContainerTypes();
    res.json({ types });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get types';
    res.status(500).json({ error: message });
  }
});

// ============================================
// TRANSPORT RATES
// ============================================

router.get('/transport-rates', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const filters = {
      containerType: req.query.containerType as string,
      destination: req.query.destination as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    };
    const items = await shippingLinesService.getAllTransportRates(filters);
    res.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get transport rates';
    res.status(500).json({ error: message });
  }
});

router.get('/transport-rates/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await shippingLinesService.getTransportRateById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get item';
    res.status(500).json({ error: message });
  }
});

router.post('/transport-rates', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await shippingLinesService.createTransportRate(req.body);
    res.status(201).json(item);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Această combinație container + greutate + destinație există deja' });
    }
    const message = error instanceof Error ? error.message : 'Failed to create';
    res.status(500).json({ error: message });
  }
});

router.put('/transport-rates/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await shippingLinesService.updateTransportRate(req.params.id, req.body);
    res.json(item);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Această combinație container + greutate + destinație există deja' });
    }
    const message = error instanceof Error ? error.message : 'Failed to update';
    res.status(500).json({ error: message });
  }
});

router.delete('/transport-rates/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    await shippingLinesService.deleteTransportRate(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete';
    res.status(500).json({ error: message });
  }
});

router.post('/transport-rates/bulk', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const results = await shippingLinesService.bulkUpsertTransportRates(req.body.items);
    res.json({ items: results, count: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk upsert';
    res.status(500).json({ error: message });
  }
});

export default router;
