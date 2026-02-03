/**
 * Payments Service
 * Business logic for payment management
 */

import prisma from '../../lib/prisma';

export interface CreatePaymentInput {
  invoiceId?: string; // Optional - can be advance payment
  clientId?: string; // Required if no invoiceId
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  paidAt?: Date;
  notes?: string;
  reconciliationStatus?: string; // PENDING, CONFIRMED, REJECTED
}

export interface UpdatePaymentInput {
  amount?: number;
  method?: string;
  reference?: string;
  notes?: string;
}

export interface PaymentFilters {
  page?: number;
  limit?: number;
  clientId?: string;
  invoiceId?: string;
  method?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class PaymentsService {
  /**
   * Get all payments with pagination and filters
   */
  async findAll(filters: PaymentFilters) {
    const {
      page = 1,
      limit = 20,
      clientId,
      invoiceId,
      method,
      dateFrom,
      dateTo,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (invoiceId) {
      where.invoiceId = invoiceId;
    } else if (clientId) {
      // Если нет invoiceId, фильтруем через invoice
      where.invoice = {
        clientId,
      };
    }

    if (method) {
      where.method = method;
    }

    if (dateFrom || dateTo) {
      where.paidAt = {};
      if (dateFrom) {
        where.paidAt.gte = dateFrom;
      }
      if (dateTo) {
        where.paidAt.lte = dateTo;
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              clientId: true,
              amount: true,
              currency: true,
              status: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment by ID
   */
  async findById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            client: {
              select: {
                id: true,
                companyName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }

  /**
   * Create new payment
   */
  async create(input: CreatePaymentInput) {
    // Validate: either invoiceId or clientId must be provided
    if (!input.invoiceId && !input.clientId) {
      throw new Error('Either invoiceId or clientId must be provided');
    }

    // Если есть invoiceId, проверяем существование invoice
    if (input.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Если указан clientId, проверяем соответствие
      if (input.clientId && invoice.clientId !== input.clientId) {
        throw new Error('Invoice does not belong to the specified client');
      }

      // Используем clientId из invoice если не указан
      if (!input.clientId) {
        input.clientId = invoice.clientId;
      }
    } else {
      // Если нет invoiceId, проверяем существование client
      const client = await prisma.client.findUnique({
        where: { id: input.clientId! },
      });

      if (!client) {
        throw new Error('Client not found');
      }
    }

    // Создаем платеж
    const payment = await prisma.payment.create({
      data: {
        invoiceId: input.invoiceId || undefined,
        clientId: input.clientId || undefined,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        reference: input.reference,
        reconciliationStatus: input.reconciliationStatus || 'PENDING',
        paidAt: input.paidAt || new Date(),
        notes: input.notes,
      } as any,
      include: {
        invoice: true,
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      } as any,
    });

    // Если платеж привязан к invoice, обновляем статус invoice
    if (input.invoiceId) {
      await this.updateInvoiceStatus(input.invoiceId);
    }

    return payment;
  }

  /**
   * Update payment
   */
  async update(id: string, input: UpdatePaymentInput) {
    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: input,
      include: {
        invoice: true,
      },
    });

    // Обновляем статус invoice если нужно
    if (payment.invoiceId) {
      await this.updateInvoiceStatus(payment.invoiceId);
    }

    return updatedPayment;
  }

  /**
   * Delete payment
   */
  async delete(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const invoiceId = payment.invoiceId;

    await prisma.payment.delete({
      where: { id },
    });

    // Обновляем статус invoice если нужно
    if (invoiceId) {
      await this.updateInvoiceStatus(invoiceId);
    }

    return { message: 'Payment deleted successfully' };
  }

  /**
   * Reconcile payment with invoice
   */
  async reconcile(paymentId: string, invoiceId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Обновляем платеж
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { invoiceId },
      include: {
        invoice: true,
      },
    });

    // Обновляем статус invoice
    await this.updateInvoiceStatus(invoiceId);

    return updatedPayment;
  }

  /**
   * Update invoice status based on payments
   */
  private async updateInvoiceStatus(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return;
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    let newStatus = invoice.status;

    if (totalPaid >= invoice.amount) {
      newStatus = 'PAID';
    } else if (invoice.dueDate < new Date() && invoice.status !== 'PAID') {
      newStatus = 'OVERDUE';
    } else if (invoice.status === 'PAID' && totalPaid < invoice.amount) {
      newStatus = 'UNPAID';
    }

    if (newStatus !== invoice.status) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          paidDate: totalPaid >= invoice.amount ? new Date() : null,
        },
      });
    }
  }
}

