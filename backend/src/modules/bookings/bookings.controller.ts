import { Router, Request, Response } from 'express';
import { BookingsService } from './bookings.service';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import { createBookingSchema } from '../../middleware/validate.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import prisma from '../../lib/prisma';
import { generateTransportOrderPDF } from './transport-order-pdf.service';
import { generatePaymentInvoicePDF } from './payment-invoice-pdf.service';
import { generateInvoiceNumber } from '../../utils/invoiceNumber';

// Allowed file extensions for document uploads
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.docx',
  '.xlsx',
  '.doc',
  '.xls',
]);
const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.sh',
  '.html',
  '.js',
  '.bat',
  '.cmd',
  '.ps1',
  '.vbs',
  '.msi',
  '.dmg',
  '.php',
  '.py',
  '.rb',
]);

// Configure multer with file size limits and type whitelist
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type "${ext}" is not allowed for security reasons.`));
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new Error(
          `File type "${ext}" is not supported. Allowed types: PDF, PNG, JPG, JPEG, DOCX, XLSX, DOC, XLS.`
        )
      );
    }
    cb(null, true);
  },
});

const router = Router();
const bookingsService = new BookingsService();

/**
 * POST /api/bookings - Create new booking
 * Auth: Required
 * Role: Any authenticated user (CLIENT, AGENT, ADMIN, etc.)
 */
router.post('/', authMiddleware, idempotencyMiddleware(), async (req: Request, res: Response) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
  }
  try {
    const booking = await bookingsService.create(parsed.data, req.user!.userId);
    res.status(201).json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/bookings - List all bookings (with filters)
 * Auth: Required
 * Role: Any authenticated user
 *
 * Query params:
 * - clientId (optional, admins only — ignored/overridden for CLIENT role)
 * - status (optional): CONFIRMED, SENT, IN_TRANSIT, ARRIVED, DELIVERED, CANCELLED
 * - dateFrom (optional): ISO date string
 * - dateTo (optional): ISO date string
 * - search (optional): Search in booking ID, client name
 * - limit (optional, default: 50): Number of results
 * - offset (optional, default: 0): Pagination offset
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = req.user!.role;

    // Ownership check: CLIENT users cannot filter by an arbitrary clientId.
    // Force their own clientId so they only see their own bookings.
    const clientIdFilter =
      userRole === 'CLIENT'
        ? req.user!.clientId // overridden — client can only see own bookings
        : (req.query.clientId as string);

    const filters = {
      clientId: clientIdFilter,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await bookingsService.findAll(filters, req.user!.userId, userRole);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bookings';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/bookings/stats - Get booking statistics
 * Auth: Required
 * Role: Any authenticated user (clients see only their stats)
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await bookingsService.getStats(req.user!.userId, req.user!.role);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/bookings/:id - Get single booking by ID
 * Auth: Required
 * Role: Any authenticated user (clients can only view their own)
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await bookingsService.findOne(req.params.id, req.user!.userId, req.user!.role);
    // Assemble pricingData from raw DB fields so BookingPricingPanel can populate on load
    const pricingData = {
      tarifMaritim: booking.freightPrice ?? 0,
      cheltuieliAditionale: (booking as any).additionalCharges ?? 0,
      cheltuieliAditionaleLabel: (booking as any).additionalChargesLabel ?? '',
      cheltuieliAditionale2: (booking as any).additionalCharges2 ?? 0,
      cheltuieliAditionale2Label: (booking as any).additionalCharges2Label ?? '',
      cheltuieliAditionale3: (booking as any).additionalCharges3 ?? 0,
      cheltuieliAditionale3Label: (booking as any).additionalCharges3Label ?? '',
      taxePortuare: booking.portTaxes ?? 0,
      transportTerestru: booking.terrestrialTransport ?? 0,
      taxeVamale: booking.customsTaxes ?? 0,
      comision: booking.commission ?? 0,
    };
    res.json({ ...booking, pricingData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch booking';
    if (message.includes('Forbidden')) {
      res.status(403).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * PUT /api/bookings/:id - Update booking
 * Auth: Required
 * Role: ADMIN, MANAGER (for status updates), CLIENT (for own bookings, limited fields)
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await bookingsService.update(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.role
    );
    res.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update booking';
    if (message.includes('Forbidden')) {
      res.status(403).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(400).json({ error: message });
    }
  }
});

/**
 * DELETE /api/bookings/:id - Cancel booking (soft delete)
 * Auth: Required
 * Role: ADMIN, SUPER_ADMIN only
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const result = await bookingsService.delete(req.params.id, req.user!.userId, req.user!.role);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete booking';
      if (message.includes('Forbidden')) {
        res.status(403).json({ error: message });
      } else if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  }
);

/**
 * POST /api/bookings/:id/documents - Upload document
 * Auth: Required
 * Role: ADMIN, AGENT, CLIENT (for own boookings)
 */
router.post(
  '/:id/documents',
  authMiddleware,
  (req: Request, res: Response, next: import('express').NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res
            .status(400)
            .json({ error: 'File is too large. Maximum allowed size is 10MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const document = await bookingsService.addDocument(
        req.params.id,
        req.file,
        req.user!.userId,
        req.user!.role
      );

      res.status(201).json(document);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload document';
      if (message.includes('Forbidden')) {
        res.status(403).json({ error: message });
      } else if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  }
);

/**
 * PATCH /api/bookings/:id/pricing - Save manual pricing breakdown (admin only)
 * Auth: Required
 * Role: ADMIN, SUPER_ADMIN, MANAGER
 */
router.patch(
  '/:id/pricing',
  authMiddleware,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const { pricingData } = req.body as {
        pricingData: {
          tarifMaritim?: number;
          cheltuieliAditionale?: number;
          cheltuieliAditionaleLabel?: string;
          cheltuieliAditionale2?: number;
          cheltuieliAditionale2Label?: string;
          cheltuieliAditionale3?: number;
          cheltuieliAditionale3Label?: string;
          taxePortuare?: number;
          transportTerestru?: number;
          taxeVamale?: number;
          comision?: number;
        };
      };

      if (!pricingData) {
        return res.status(400).json({ error: 'pricingData is required' });
      }

      // Map UI fields → Prisma booking fields
      const totalPrice =
        (pricingData.tarifMaritim || 0) +
        (pricingData.cheltuieliAditionale || 0) +
        (pricingData.cheltuieliAditionale2 || 0) +
        (pricingData.cheltuieliAditionale3 || 0) +
        (pricingData.taxePortuare || 0) +
        (pricingData.transportTerestru || 0) +
        (pricingData.taxeVamale || 0) +
        (pricingData.comision || 0);

      const updateData: any = {
        freightPrice: pricingData.tarifMaritim ?? undefined,
        additionalCharges: pricingData.cheltuieliAditionale ?? undefined,
        additionalChargesLabel: pricingData.cheltuieliAditionaleLabel ?? undefined,
        additionalCharges2: pricingData.cheltuieliAditionale2 ?? undefined,
        additionalCharges2Label: pricingData.cheltuieliAditionale2Label ?? undefined,
        additionalCharges3: pricingData.cheltuieliAditionale3 ?? undefined,
        additionalCharges3Label: pricingData.cheltuieliAditionale3Label ?? undefined,
        portTaxes: pricingData.taxePortuare ?? undefined,
        customsTaxes: pricingData.taxeVamale ?? undefined,
        terrestrialTransport: pricingData.transportTerestru ?? undefined,
        commission: pricingData.comision ?? undefined,
        totalPrice,
      };

      const updated = await prisma.booking.update({
        where: { id: req.params.id },
        data: updateData,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'BOOKING_PRICING_UPDATED',
          entityType: 'Booking',
          entityId: req.params.id,
          changes: JSON.stringify({ pricingData, totalPrice }),
        },
      });

      res.json({ success: true, totalPrice });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update pricing';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/bookings/:id/transport-order.pdf
 * Generate and download "Comandă Transport" PDF
 * Auth: Required
 * Role: ADMIN, SUPER_ADMIN, MANAGER or CLIENT (own booking)
 */
router.get('/:id/transport-order.pdf', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await bookingsService.findOne(req.params.id, req.user!.userId, req.user!.role);

    const pdfBuffer = await generateTransportOrderPDF({
      bookingId: booking.id,
      blNumber: booking.containers?.[0]?.blNumber ?? (booking as any).blNumber,
      portOrigin: booking.portOrigin,
      portDestination: booking.portDestination,
      containerType: booking.containerType,
      containerNumber: booking.containers?.[0]?.containerNumber,
      shippingLine: booking.shippingLine,
      eta: booking.eta,
      shipperName: (booking as any).shipperName ?? (booking as any).supplierName,
      beneficiaryName:
        (booking as any).beneficiaryName ??
        booking.client?.companyName ??
        booking.client?.contactPerson,
      beneficiaryAddress: booking.client?.address,
      beneficiaryPhone: booking.client?.phone,
      beneficiaryEmail: booking.client?.email,
      createdAt: booking.createdAt,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comanda-transport-${booking.id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate PDF';
    if (message.includes('Forbidden')) {
      res.status(403).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * GET /api/bookings/:id/payment-invoice.pdf
 * Generate and download "Factură de Plată" PDF
 * Auth: Required
 * Role: ADMIN, SUPER_ADMIN, MANAGER or CLIENT (own booking)
 */
router.get('/:id/payment-invoice.pdf', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await bookingsService.findOne(req.params.id, req.user!.userId, req.user!.role);

    // Generate sequential invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Build line items from booking pricing
    const lineItems = [];
    if (booking.freightPrice > 0) {
      lineItems.push({
        description: `Transport maritim: ${booking.portOrigin} → ${booking.portDestination}`,
        quantity: 1,
        unitPrice: booking.freightPrice,
        total: booking.freightPrice,
      });
    }
    if (booking.portTaxes > 0) {
      lineItems.push({
        description: 'Taxe portuare',
        quantity: 1,
        unitPrice: booking.portTaxes,
        total: booking.portTaxes,
      });
    }
    if (booking.customsTaxes > 0) {
      lineItems.push({
        description: 'Taxe vamale',
        quantity: 1,
        unitPrice: booking.customsTaxes,
        total: booking.customsTaxes,
      });
    }
    if (booking.terrestrialTransport > 0) {
      lineItems.push({
        description: 'Transport terestru',
        quantity: 1,
        unitPrice: booking.terrestrialTransport,
        total: booking.terrestrialTransport,
      });
    }
    if (booking.commission > 0) {
      lineItems.push({
        description: 'Servicii de logistică și coordonare',
        quantity: 1,
        unitPrice: booking.commission,
        total: booking.commission,
      });
    }
    if ((booking as any).additionalCharges > 0) {
      lineItems.push({
        description: 'Cheltuieli adiționale',
        quantity: 1,
        unitPrice: (booking as any).additionalCharges,
        total: (booking as any).additionalCharges,
      });
    }
    if (lineItems.length === 0) {
      lineItems.push({
        description: `Servicii logistice rezervare ${booking.id}`,
        quantity: 1,
        unitPrice: booking.totalPrice,
        total: booking.totalPrice,
      });
    }

    const pdfBuffer = await generatePaymentInvoicePDF({
      bookingId: booking.id,
      invoiceNumber,
      issueDate: new Date(),
      clientName: booking.client?.companyName ?? booking.client?.contactPerson,
      clientIdno: booking.client?.taxId,
      clientAddress: booking.client?.address,
      clientPhone: booking.client?.phone,
      clientEmail: booking.client?.email,
      items: lineItems,
      currency: 'USD',
      vatRate: 0, // 0% TVA for international transport services
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cont-plata-${booking.id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate invoice PDF';
    if (message.includes('Forbidden')) {
      res.status(403).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export default router;
