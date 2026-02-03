import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import invoicesService, { CreateInvoiceData, UpdateInvoiceData, PaymentData } from './invoices.service';

const router = Router();

// ============================================
// INVOICE ROUTES
// ============================================

/**
 * GET /api/invoices/stats
 * Get invoice statistics
 * @access ADMIN, SUPER_ADMIN, MANAGER
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const clientId = user.role === 'CLIENT' ? user.clientId : undefined;

    const stats = await invoicesService.getStats(clientId);
    res.json(stats);
  } catch (error: any) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get statistics' });
  }
});

/**
 * GET /api/invoices
 * List all invoices with pagination and filters
 * @access All authenticated users (filtered by role)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      status: req.query.status as string,
      clientId: req.query.clientId as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      search: req.query.search as string,
    };

    const result = await invoicesService.findAll(filters, user.role, user.clientId);
    res.json(result);
  } catch (error: any) {
    console.error('List invoices error:', error);
    res.status(500).json({ error: error.message || 'Failed to list invoices' });
  }
});

/**
 * GET /api/invoices/:id
 * Get single invoice with details
 * @access All authenticated users (permission checked)
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const invoice = await invoicesService.findOne(id, user.role, user.clientId);
    res.json(invoice);
  } catch (error: any) {
    console.error('Get invoice error:', error);
    
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to get invoice' });
  }
});

/**
 * POST /api/invoices
 * Create new invoice
 * @access ADMIN, SUPER_ADMIN
 */
router.post('/', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { bookingId, clientId, dueDate, notes, discount } = req.body;

    // Validation
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    if (!dueDate) {
      return res.status(400).json({ error: 'Due date is required' });
    }

    // Validate due date is in future
    const dueDateObj = new Date(dueDate);
    if (dueDateObj < new Date()) {
      return res.status(400).json({ error: 'Due date must be in the future' });
    }

    // Validate discount
    if (discount !== undefined && (discount < 0 || discount > 100)) {
      return res.status(400).json({ error: 'Discount must be between 0 and 100' });
    }

    const invoiceData: CreateInvoiceData = {
      bookingId,
      clientId,
      dueDate: dueDateObj,
      notes,
      discount,
    };

    const invoice = await invoicesService.create(invoiceData, user.userId);
    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to create invoice' });
  }
});

/**
 * PUT /api/invoices/:id
 * Update invoice (only DRAFT)
 * @access ADMIN, SUPER_ADMIN
 */
router.put('/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { dueDate, notes, discount } = req.body;

    // Validate due date if provided
    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      if (dueDateObj < new Date()) {
        return res.status(400).json({ error: 'Due date must be in the future' });
      }
    }

    const updateData: UpdateInvoiceData = {
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
      discount,
    };

    const invoice = await invoicesService.update(id, updateData, user.userId);
    res.json(invoice);
  } catch (error: any) {
    console.error('Update invoice error:', error);
    
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (error.message.includes('Only draft')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to update invoice' });
  }
});

/**
 * POST /api/invoices/:id/send
 * Send invoice to client
 * @access ADMIN, SUPER_ADMIN
 */
router.post('/:id/send', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const result = await invoicesService.send(id, user.userId);
    res.json(result);
  } catch (error: any) {
    console.error('Send invoice error:', error);
    
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (error.message.includes('Only draft')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to send invoice' });
  }
});

/**
 * POST /api/invoices/:id/mark-paid
 * Record payment and mark invoice as paid
 * @access ADMIN, SUPER_ADMIN
 */
router.post('/:id/mark-paid', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { amount, paymentDate, paymentMethod, reference, notes } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }
    if (!paymentDate) {
      return res.status(400).json({ error: 'Payment date is required' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    const validMethods = ['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `Payment method must be one of: ${validMethods.join(', ')}` });
    }

    const paymentData: PaymentData = {
      amount: parseFloat(amount),
      paymentDate: new Date(paymentDate),
      paymentMethod,
      reference,
      notes,
    };

    const result = await invoicesService.markPaid(id, paymentData, user.userId);
    res.json(result);
  } catch (error: any) {
    console.error('Mark paid error:', error);
    
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (error.message.includes('Cannot') || error.message.includes('exceeds')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to record payment' });
  }
});

/**
 * DELETE /api/invoices/:id
 * Cancel invoice
 * @access ADMIN, SUPER_ADMIN
 */
router.delete('/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { reason } = req.body;

    const invoice = await invoicesService.cancel(id, user.userId, reason);
    res.json({ message: 'Invoice cancelled successfully', invoice });
  } catch (error: any) {
    console.error('Cancel invoice error:', error);
    
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to cancel invoice' });
  }
});

/**
 * GET /api/invoices/:id/pdf
 * Download invoice PDF
 * @access All authenticated users (permission checked)
 */
router.get('/:id/pdf', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const result = await invoicesService.generatePDF(id, user.role, user.clientId);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  } catch (error: any) {
    console.error('Generate PDF error:', error);
    
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
});

/**
 * POST /api/v1/invoices/bulk-generate
 * Bulk generate invoices for multiple clients
 * @access ADMIN, SUPER_ADMIN, MANAGER
 */
router.post(
  '/bulk-generate',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { clientIds, dateFrom, dateTo } = req.body;

      // Validation
      if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ error: 'clientIds array is required' });
      }

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'dateFrom and dateTo are required' });
      }

      const dateFromObj = new Date(dateFrom);
      const dateToObj = new Date(dateTo);

      if (dateFromObj > dateToObj) {
        return res.status(400).json({ error: 'dateFrom must be before dateTo' });
      }

      const result = await invoicesService.bulkGenerate(
        clientIds,
        dateFromObj,
        dateToObj,
        user.userId
      );

      res.status(201).json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Bulk generate invoices error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk generate invoices',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/invoices/update-overdue
 * Update overdue invoices status (for cron job)
 * @access ADMIN, SUPER_ADMIN
 */
router.post('/update-overdue', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const count = await invoicesService.updateOverdueStatus();
    res.json({ message: `Updated ${count} invoices to overdue status` });
  } catch (error: any) {
    console.error('Update overdue error:', error);
    res.status(500).json({ error: error.message || 'Failed to update overdue status' });
  }
});

export default router;

