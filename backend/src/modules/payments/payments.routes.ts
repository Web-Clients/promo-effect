/**
 * Payments Routes
 * API endpoints for payment management
 */

import { Router, Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';

const router = Router();
const paymentsService = new PaymentsService();

/**
 * GET /api/v1/payments
 * List all payments with pagination and filters
 * Access: Authenticated users
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const filters = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      clientId: req.query.client_id as string,
      invoiceId: req.query.invoice_id as string,
      method: req.query.method as string,
      dateFrom: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      dateTo: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
    };

    const result = await paymentsService.findAll(filters);
    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/payments/:id
 * Get payment details
 * Access: Authenticated users
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const payment = await paymentsService.findById(req.params.id);
    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment not found';
    const status = message === 'Payment not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/payments
 * Create new payment
 * Access: ADMIN, MANAGER, OPERATOR
 */
router.post(
  '/',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OPERATOR']),
  async (req: Request, res: Response) => {
    try {
      const payment = await paymentsService.create(req.body);
      res.status(201).json({
        success: true,
        data: payment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create payment';
      res.status(400).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * PUT /api/v1/payments/:id
 * Update payment
 * Access: ADMIN, MANAGER
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const payment = await paymentsService.update(req.params.id, req.body);
      res.json({
        success: true,
        data: payment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update payment';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * DELETE /api/v1/payments/:id
 * Delete payment
 * Access: ADMIN only
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await paymentsService.delete(req.params.id);
      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete payment';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/v1/payments/:id/reconcile
 * Reconcile payment with invoice
 * Access: ADMIN, MANAGER
 */
router.post(
  '/:id/reconcile',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          error: 'invoiceId is required',
          timestamp: new Date().toISOString(),
        });
      }

      const payment = await paymentsService.reconcile(req.params.id, invoiceId);
      res.json({
        success: true,
        data: payment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reconcile payment';
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;

