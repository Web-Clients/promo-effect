import prisma from '../../lib/prisma';
import { generateInvoiceNumber } from '../../utils/invoiceNumber';
import {
  VAT_RATE,
  CreateInvoiceData,
  UpdateInvoiceData,
  PaymentData,
  InvoiceFilters,
  InvoiceStats,
} from './invoices.types';
import { sendInvoiceEmail } from './invoices-email';
import {
  applyDiscount,
  calcTotalWithVat,
  calcDueDate,
  getInvoiceStats,
  bulkGenerateInvoices,
  findAllInvoices,
  findOneInvoice,
} from './invoices-calculator';
import {
  buildInvoicePDFBuffer,
  uploadInvoicePDF,
  generateInvoicePDFById,
  notifyInvoiceSent,
  notifyPaymentReceived,
} from './invoices-pdf.service';

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
   * Delegates to invoices-calculator.ts
   */
  async findAll(filters: InvoiceFilters, userRole?: string, userClientId?: string) {
    return findAllInvoices(filters, userRole, userClientId);
  }

  /**
   * Get single invoice by ID with all details
   * Delegates to invoices-calculator.ts
   */
  async findOne(id: string, userRole?: string, userClientId?: string) {
    return findOneInvoice(id, userRole, userClientId);
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
    let baseAmount = booking.totalPrice;

    // Apply discount if provided
    let discountAmount = 0;
    let amount = baseAmount;
    if (data.discount && data.discount > 0) {
      const discounted = applyDiscount(baseAmount, data.discount);
      amount = discounted.amount;
      discountAmount = discounted.discountAmount;
    }

    // Calculate VAT (19% for Moldova)
    const { vatAmount, totalAmount } = calcTotalWithVat(amount);

    // Get client payment terms for due date calculation if not provided
    const clientWithExtras = client as any;
    const dueDate = data.dueDate || calcDueDate(clientWithExtras.paymentTerms || 30);

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
    const pdfBuffer = await buildInvoicePDFBuffer(invoice as any);

    // Save PDF to storage and get URL
    const pdfUrl = await uploadInvoicePDF(pdfBuffer, invoice.invoiceNumber);

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
    await notifyInvoiceSent(updatedInvoice, pdfUrl);

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
    await notifyPaymentReceived(
      updatedInvoice,
      paymentData,
      totalPaid,
      totalAmount,
      isFullyPaid,
      invoice.currency
    );

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
   * Delegates to invoices-calculator.ts
   */
  async bulkGenerate(clientIds: string[], dateFrom: Date, dateTo: Date, createdBy: string) {
    return bulkGenerateInvoices(clientIds, dateFrom, dateTo, createdBy, this.create.bind(this));
  }

  /**
   * Generate PDF for invoice — delegates to invoices-pdf.service.ts
   */
  async generatePDF(id: string, userRole?: string, userClientId?: string) {
    return generateInvoicePDFById(id, userRole, userClientId);
  }

  /**
   * Get invoice statistics — delegates to invoices-calculator.ts
   */
  async getStats(clientId?: string): Promise<InvoiceStats> {
    return getInvoiceStats(clientId);
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
