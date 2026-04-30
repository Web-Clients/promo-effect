/**
 * Price Requests Routes
 * POST /api/price-requests — log a price request when no price is found in DB
 * Used by the "Contact reprezentant" fallback in the calculator
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import logger from '../../utils/logger';
import { t } from '../../utils/i18n';

const router = Router();

// In-memory log (fallback before DB migration)
// After running A21 migration, replace with prisma.priceRequestLog.create(...)
const priceRequestLog: any[] = [];

const PriceRequestSchema = z.object({
  name: z.string().min(1, t('validation.nameRequired')),
  email: z.string().email(t('validation.invalidEmail')),
  phone: z.string().optional(),
  message: z.string().optional(),
  portOrigin: z.string().optional(),
  portDestination: z.string().optional(),
  containerType: z.string().optional(),
  cargoWeight: z.string().optional(),
  incoterm: z.string().optional(),
  finalDestination: z.string().optional(),
});

/**
 * POST /api/price-requests
 * Log a price request from calculator "Contact reprezentant" flow
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = PriceRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Date invalide',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const entry = {
      id: `pr-${Date.now()}`,
      ...parsed.data,
      createdAt: new Date().toISOString(),
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    priceRequestLog.push(entry);

    // Log to server logger
    logger.info('[PriceRequest] New price request logged', {
      id: entry.id,
      name: entry.name,
      email: entry.email,
      portOrigin: entry.portOrigin,
      portDestination: entry.portDestination,
      containerType: entry.containerType,
      incoterm: entry.incoterm,
    });

    // TODO (after A21 migration): persist to PriceRequestLog DB table
    // await prisma.priceRequestLog.create({ data: entry });

    res.status(201).json({
      success: true,
      id: entry.id,
      message: 'Cererea a fost înregistrată. Reprezentantul vă va contacta în curând.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create price request';
    logger.error('[PriceRequest] Error:', error);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/price-requests — Admin only: list logged requests
 */
router.get('/', async (_req: Request, res: Response) => {
  res.json({ requests: priceRequestLog });
});

export default router;
