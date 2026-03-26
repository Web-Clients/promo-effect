import prisma from '../../lib/prisma';
import { generateInvoiceNumber } from '../../utils/invoiceNumber';
import { generateInvoicePDF } from '../../services/pdf.service';
import notificationService from '../../services/notification.service';
import { storageService } from '../../services/storage.service';
import {
  VAT_RATE,
  CreateInvoiceData,
  UpdateInvoiceData,
  PaymentData,
  InvoiceFilters,
  InvoiceStats,
} from './invoices.types';
import { sendInvoiceEmail } from './invoices-email';

// Re-export types for backward compatibility
export {
  VAT_RATE,
  CreateInvoiceData,
  UpdateInvoiceData,
  PaymentData,
  InvoiceFilters,
  InvoiceStats,
} from './invoices.types';

class InvoicesService {
  /**
   * Get all invoices with filtering and pagination
   */
  async findAll(filters: InvoiceFilters, userRole?: string, userClientId?: string) {
    const { page = 1, limit = 10, status, clientId, dateFrom, dateTo, search } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Role-based filtering: CLIENT can only see their own invoices
    if (userRole === 'CLIENT' && userClientId) {
      where.clientId = userClientId;
    } else if (clientId) {
      where.clientId = clientId;
    }

    // Status filter
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) where.issueDate.lte = new Date(dateTo);
    }

    // Search filter (invoice number or client name)
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Execute queries
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true,
              email: true,
              phone: true,
            },
          },
          booking: {
            select: {
              id: true,
              portOrigin: true,
              portDestination: true,
              containerType: true,
              status: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paidAt: true,
              method: true,
            },
          },
          _count: {
            select: { payments: true },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    // Calculate totals for current filter
    const totals = await prisma.invoice.aggregate({
      where,
      _sum: { amount: true },
    });

    const paidTotals = await prisma.payment.aggregate({
      where: {
        invoice: where,
      },
      _sum: { amount: true },
    });

    return {
      invoices: invoices.map((inv) => ({
        ...inv,
        amountPaid: inv.payments.reduce((sum, p) => sum + p.amount, 0),
        balance: inv.amount - inv.payments.reduce((sum, p) => sum + p.amount, 0),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalAmount: totals._sum.amount || 0,
        totalPaid: paidTotals._sum.amount || 0,
        totalOutstanding: (totals._sum.amount || 0) - (paidTotals._sum.amount || 0),
      },
    };
  }

  /**
   * Get single invoice by ID with all details
   */
  async findOne(id: string, userRole?: string, userClientId?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        booking: true,
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Permission check: CLIENT can only see their own invoices
    if (userRole === 'CLIENT' && userClientId && invoice.clientId !== userClientId) {
      throw new Error('Access denied');
    }

    const amountPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      ...invoice,
      subtotal: invoice.amount / (1 + VAT_RATE),
      taxRate: VAT_RATE * 100,
      taxAmount: invoice.amount - invoice.amount / (1 + VAT_RATE),
      amountPaid,
      balance: invoice.amount - amountPaid,
    };
  }

  /**
   * Create new invoice
   */
  async create(data: CreateInvoiceData, createdBy: string) {
    // Validate booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Validate client exists
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Check for existing invoice for this booking
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        bookingId: data.bookingId,
        status: { notIn: ['CANCELLED'] },
      },
    });

    if (existingInvoice) {
      throw new Error(`Invoice already exists for this booking: ${existingInvoice.invoiceNumber}`);
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate amount from booking
    let amount = booking.totalPrice;

    // Apply discount if provided
    let discountAmount = 0;
    if (data.discount && data.discount > 0) {
      discountAmount = amount * (data.discount / 100);
      amount = amount - discountAmount;
    }

    // Calculate VAT (19% for Moldova)
    const vatAmount = amount * VAT_RATE;
    const totalAmount = amount + vatAmount;

    // Get client payment terms for due date calculation if not provided
    const clientWithExtras = client as any;
    const dueDate =
      data.dueDate ||
      (() => {
        const days = clientWithExtras.paymentTerms || 30;
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
      })();

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId: data.bookingId,
        clientId: data.clientId,
        amount, // Amount without VAT
        vatPercent: VAT_RATE * 100, // 19%
        vatAmount,
        totalAmount, // Amount + VAT
        currency: 'USD',
        issueDate: new Date(),
        dueDate: new Date(dueDate),
        status: 'DRAFT',
        discount: data.discount || 0,
        discountAmount,
        notes: data.notes,
        remindersSent: JSON.stringify([]), // Initialize empty reminders array
      } as any,
      include: {
        client: true,
        booking: true,
        payments: true,
      },
    });

    // Log audit
    await this.logAudit('INVOICE_CREATED', invoice.id, createdBy, { invoiceNumber, amount });

    return invoice;
  }

  /**
   * Update invoice (only DRAFT status)
   */
  async update(id: string, data: UpdateInvoiceData, updatedBy: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'DRAFT') {
      throw new Error('Only draft invoices can be updated');
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: {
        client: true,
        booking: true,
        payments: true,
      },
    });

    // Log audit
    await this.logAudit('INVOICE_UPDATED', id, updatedBy, data);

    return updatedInvoice;
  }

  /**
   * Send invoice to client (change status to SENT/UNPAID)
   */
  async send(id: string, sentBy: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        booking: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'DRAFT') {
      throw new Error('Only draft invoices can be sent');
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice as any);

    // Save PDF to storage and get URL
    let pdfUrl: string | null = null;
    try {
      pdfUrl = await storageService.uploadFile(
        pdfBuffer,
        `${invoice.invoiceNumber}.pdf`,
        'invoices'
      );
    } catch (error) {
      console.error('Failed to save PDF to storage:', error);
      // Continue even if storage fails
    }

    // Update invoice status (DRAFT -> ISSUED -> SENT)
    const newStatus = invoice.status === 'DRAFT' ? 'ISSUED' : 'SENT';

    // Update reminders sent (add current timestamp)
    const invoiceWithExtras = invoice as any;
    const reminders = invoiceWithExtras.remindersSent
      ? JSON.parse(invoiceWithExtras.remindersSent)
      : [];
    reminders.push({
      date: new Date().toISOString(),
      type: 'INVOICE_SENT',
    });

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: newStatus,
        remindersSent: JSON.stringify(reminders),
        pdfUrl: pdfUrl || undefined,
        updatedAt: new Date(),
      } as any,
      include: {
        client: true,
        booking: true,
        payments: true,
      },
    });

    // Send email with PDF attachment via Infobip
    try {
      await sendInvoiceEmail(updatedInvoice, pdfBuffer, pdfUrl);
    } catch (error) {
      console.error('Failed to send invoice email:', error);
      // Don't fail the whole operation if email fails
    }

    // Send notification to client
    try {
      const clientUsers = await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          // TODO: Add proper clientId relation when available
        },
        take: 5,
      });

      for (const user of clientUsers) {
        try {
          await notificationService.sendNotification({
            userId: user.id,
            bookingId: invoice.bookingId,
            type: 'INVOICE_SENT',
            title: `Factură ${invoice.invoiceNumber}`,
            message: `Factura ${invoice.invoiceNumber} în valoare de ${(invoice as any).totalAmount || invoice.amount} ${invoice.currency} a fost emisă. Data scadență: ${new Date(invoice.dueDate).toLocaleDateString('ro-RO')}.`,
            channels: {
              email: true,
              sms: false,
              whatsapp: false,
              push: true,
            },
            templateData: {
              invoiceNumber: invoice.invoiceNumber,
              amount: (invoice as any).totalAmount || invoice.amount,
              currency: invoice.currency,
              dueDate: new Date(invoice.dueDate).toLocaleDateString('ro-RO'),
              clientName: invoice.client.companyName,
              pdfUrl: pdfUrl || undefined,
            },
          });
        } catch (error) {
          console.error(`Failed to send notification to user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to send invoice notifications:', error);
      // Don't fail the whole operation if notification fails
    }

    // Log audit
    await this.logAudit('INVOICE_SENT', id, sentBy, { clientEmail: invoice.client.email });

    return {
      ...updatedInvoice,
      message: `Invoice sent to ${invoice.client.email}`,
    };
  }

  /**
   * Mark invoice as paid
   */
  async markPaid(id: string, paymentData: PaymentData, markedBy: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'CANCELLED') {
      throw new Error('Cannot add payment to cancelled invoice');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Invoice is already fully paid');
    }

    // Validate payment amount (use totalAmount which includes VAT)
    const invoiceWithExtras = invoice as any;
    const currentPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalAmount = invoiceWithExtras.totalAmount || invoice.amount;
    const remaining = totalAmount - currentPaid;

    if (paymentData.amount > remaining + 0.01) {
      throw new Error(`Payment amount exceeds remaining balance of $${remaining.toFixed(2)}`);
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: paymentData.amount,
        currency: invoice.currency,
        method: paymentData.paymentMethod,
        reference: paymentData.reference,
        notes: paymentData.notes,
        paidAt: new Date(paymentData.paymentDate),
      },
    });

    // Check if fully paid
    const totalPaid = currentPaid + paymentData.amount;
    const isFullyPaid = totalPaid >= totalAmount - 0.01;

    // Update invoice status and payment method
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: isFullyPaid ? 'PAID' : invoice.status,
        paidDate: isFullyPaid ? new Date(paymentData.paymentDate) : null,
        paymentMethod: paymentData.paymentMethod,
        updatedAt: new Date(),
      } as any,
      include: {
        client: true,
        booking: true,
        payments: true,
      },
    });

    // Update client total revenue
    await prisma.client.update({
      where: { id: invoice.clientId },
      data: {
        totalRevenue: { increment: paymentData.amount },
      },
    });

    // Log audit
    await this.logAudit('PAYMENT_RECORDED', id, markedBy, {
      paymentId: payment.id,
      amount: paymentData.amount,
      method: paymentData.paymentMethod,
      isFullyPaid,
    });

    // Send email notification to client about payment
    try {
      const clientEmail = updatedInvoice.client?.email;
      if (clientEmail) {
        const clientUser = await prisma.user.findFirst({
          where: { email: clientEmail },
        });

        if (clientUser || updatedInvoice.clientId) {
          await notificationService.sendNotification({
            userId: clientUser?.id || updatedInvoice.clientId,
            bookingId: updatedInvoice.bookingId || undefined,
            type: isFullyPaid ? 'INVOICE_PAID' : 'PAYMENT_RECEIVED',
            title: isFullyPaid
              ? `Factură ${updatedInvoice.invoiceNumber} - Plătită Complet`
              : `Plată Primită pentru Factura ${updatedInvoice.invoiceNumber}`,
            message: isFullyPaid
              ? `Factura ${updatedInvoice.invoiceNumber} a fost plătită complet.\n\nSuma plătită: ${paymentData.amount.toFixed(2)} ${invoice.currency}\nMetodă de plată: ${paymentData.paymentMethod}\nData plății: ${new Date(paymentData.paymentDate).toLocaleDateString('ro-RO')}\n\nMulțumim pentru plată!`
              : `Am primit o plată pentru factura ${updatedInvoice.invoiceNumber}.\n\nSuma plătită: ${paymentData.amount.toFixed(2)} ${invoice.currency}\nTotal plătit: ${totalPaid.toFixed(2)} ${invoice.currency}\nRest de plată: ${(totalAmount - totalPaid).toFixed(2)} ${invoice.currency}\nMetodă de plată: ${paymentData.paymentMethod}\nData plății: ${new Date(paymentData.paymentDate).toLocaleDateString('ro-RO')}`,
            channels: { email: true, push: false, sms: false, whatsapp: false },
          });
        }
      }
    } catch (error) {
      console.error('[InvoicesService] Failed to send payment notification email:', error);
      // Don't fail the payment if email fails
    }

    return {
      invoice: updatedInvoice,
      payment,
      amountPaid: totalPaid,
      balance: totalAmount - totalPaid,
    };
  }

  /**
   * Cancel invoice
   */
  async cancel(id: string, cancelledBy: string, reason?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Cannot cancel a paid invoice');
    }

    if (invoice.payments.length > 0) {
      throw new Error('Cannot cancel invoice with existing payments');
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${invoice.notes || ''}\n\nAnulată: ${reason}`.trim() : invoice.notes,
        updatedAt: new Date(),
      },
      include: {
        client: true,
        booking: true,
        payments: true,
      },
    });

    // Log audit
    await this.logAudit('INVOICE_CANCELLED', id, cancelledBy, { reason });

    return updatedInvoice;
  }

  /**
   * Bulk generate invoices for multiple clients
   */
  async bulkGenerate(clientIds: string[], dateFrom: Date, dateTo: Date, createdBy: string) {
    const invoices: any[] = [];
    const errors: any[] = [];

    for (const clientId of clientIds) {
      try {
        const client = await prisma.client.findUnique({
          where: { id: clientId },
        });

        if (!client) {
          errors.push({ clientId, error: 'Client not found' });
          continue;
        }

        // Find unpaid bookings in date range
        const bookings = await prisma.booking.findMany({
          where: {
            clientId,
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
            invoices: {
              none: {
                status: {
                  notIn: ['CANCELLED'],
                },
              },
            },
          },
          include: {
            containers: true,
          },
        });

        if (bookings.length === 0) {
          continue; // No bookings to invoice
        }

        for (const booking of bookings) {
          try {
            const clientWithExtras = client as any;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (clientWithExtras.paymentTerms || 30));

            const invoice = await this.create(
              {
                bookingId: booking.id,
                clientId: client.id,
                dueDate,
                discount: clientWithExtras.discount || 0,
              },
              createdBy
            );

            invoices.push(invoice);
          } catch (error: any) {
            errors.push({
              clientId,
              bookingId: booking.id,
              error: error.message,
            });
          }
        }
      } catch (error: any) {
        errors.push({ clientId, error: error.message });
      }
    }

    return {
      success: true,
      generated: invoices.length,
      invoices,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate PDF for invoice
   */
  async generatePDF(id: string, userRole?: string, userClientId?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        booking: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Permission check
    if (userRole === 'CLIENT' && userClientId && invoice.clientId !== userClientId) {
      throw new Error('Access denied');
    }

    const pdfBuffer = await generateInvoicePDF(invoice as any);

    return {
      buffer: pdfBuffer,
      filename: `${invoice.invoiceNumber}.pdf`,
      contentType: 'application/pdf',
    };
  }

  /**
   * Get invoice statistics
   */
  async getStats(clientId?: string): Promise<InvoiceStats> {
    const where = clientId ? { clientId } : {};

    const [total, totalAmountResult, paidAmountResult, statusCounts, monthlyData] =
      await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.aggregate({
          where,
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: clientId ? { invoice: { clientId } } : {},
          _sum: { amount: true },
        }),
        prisma.invoice.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        this.getMonthlyRevenue(clientId),
      ]);

    const byStatus = {
      draft: 0,
      unpaid: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };

    statusCounts.forEach((sc) => {
      const key = sc.status.toLowerCase() as keyof typeof byStatus;
      if (key in byStatus) {
        byStatus[key] = sc._count;
      }
    });

    // Check for overdue invoices
    const overdueCount = await prisma.invoice.count({
      where: {
        ...where,
        status: { in: ['UNPAID', 'SENT'] },
        dueDate: { lt: new Date() },
      },
    });

    byStatus.overdue = overdueCount;

    return {
      total,
      totalAmount: totalAmountResult._sum.amount || 0,
      totalPaid: paidAmountResult._sum.amount || 0,
      totalOutstanding: (totalAmountResult._sum.amount || 0) - (paidAmountResult._sum.amount || 0),
      byStatus,
      monthlyRevenue: monthlyData,
    };
  }

  /**
   * Get monthly revenue data for charts
   */
  private async getMonthlyRevenue(clientId?: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const where = {
      issueDate: { gte: sixMonthsAgo },
      ...(clientId ? { clientId } : {}),
    };

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        amount: true,
        issueDate: true,
        payments: {
          select: { amount: true },
        },
      },
    });

    // Group by month
    const monthlyMap = new Map<string, { amount: number; paid: number }>();

    invoices.forEach((inv) => {
      const month = inv.issueDate.toISOString().slice(0, 7); // YYYY-MM
      const current = monthlyMap.get(month) || { amount: 0, paid: 0 };
      current.amount += inv.amount;
      current.paid += inv.payments.reduce((sum, p) => sum + p.amount, 0);
      monthlyMap.set(month, current);
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        amount: Math.round(data.amount * 100) / 100,
        paid: Math.round(data.paid * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Update overdue invoices status
   */
  async updateOverdueStatus() {
    const now = new Date();

    const result = await prisma.invoice.updateMany({
      where: {
        status: { in: ['UNPAID', 'SENT'] },
        dueDate: { lt: now },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    return result.count;
  }

  /**
   * Log audit trail
   */
  private async logAudit(action: string, invoiceId: string, userId: string, details: any) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType: 'INVOICE',
          entityId: invoiceId,
          changes: JSON.stringify(details),
          ipAddress: '',
        },
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }
}

export const invoicesService = new InvoicesService();
export default invoicesService;
