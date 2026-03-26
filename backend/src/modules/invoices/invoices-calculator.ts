import prisma from '../../lib/prisma';
import { VAT_RATE, InvoiceStats, InvoiceFilters, CreateInvoiceData } from './invoices.types';

// ============================================
// READ QUERIES (findAll / findOne)
// ============================================

/**
 * Get all invoices with filtering and pagination
 */
export async function findAllInvoices(
  filters: InvoiceFilters,
  userRole?: string,
  userClientId?: string
) {
  const { page = 1, limit = 10, status, clientId, dateFrom, dateTo, search } = filters;
  const skip = (page - 1) * limit;
  const where: any = {};

  if (userRole === 'CLIENT' && userClientId) {
    where.clientId = userClientId;
  } else if (clientId) {
    where.clientId = clientId;
  }

  if (status && status !== 'all') where.status = status.toUpperCase();

  if (dateFrom || dateTo) {
    where.issueDate = {};
    if (dateFrom) where.issueDate.gte = new Date(dateFrom);
    if (dateTo) where.issueDate.lte = new Date(dateTo);
  }

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { client: { companyName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, companyName: true, contactPerson: true, email: true, phone: true },
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
        payments: { select: { id: true, amount: true, paidAt: true, method: true } },
        _count: { select: { payments: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const totals = await prisma.invoice.aggregate({ where, _sum: { amount: true } });
  const paidTotals = await prisma.payment.aggregate({
    where: { invoice: where },
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
export async function findOneInvoice(id: string, userRole?: string, userClientId?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, booking: true, payments: { orderBy: { paidAt: 'desc' } } },
  });

  if (!invoice) throw new Error('Invoice not found');

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

// ============================================
// CALCULATION / TOTALS HELPERS
// ============================================

/**
 * Calculate subtotal (amount without VAT) from total amount
 */
export function calcSubtotal(amount: number): number {
  return amount / (1 + VAT_RATE);
}

/**
 * Calculate VAT amount from total amount
 */
export function calcTaxAmount(amount: number): number {
  return amount - amount / (1 + VAT_RATE);
}

/**
 * Calculate amount after discount
 */
export function applyDiscount(
  amount: number,
  discountPercent: number
): { amount: number; discountAmount: number } {
  const discountAmount = amount * (discountPercent / 100);
  return { amount: amount - discountAmount, discountAmount };
}

/**
 * Calculate total with VAT
 */
export function calcTotalWithVat(amount: number): { vatAmount: number; totalAmount: number } {
  const vatAmount = amount * VAT_RATE;
  const totalAmount = amount + vatAmount;
  return { vatAmount, totalAmount };
}

/**
 * Determine due date from payment terms (days)
 */
export function calcDueDate(paymentTermsDays: number = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() + paymentTermsDays);
  return date;
}

/**
 * Get monthly revenue data for charts (last 6 months)
 */
export async function getMonthlyRevenue(
  clientId?: string
): Promise<Array<{ month: string; amount: number; paid: number }>> {
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
 * Get full invoice statistics
 */
export async function getInvoiceStats(clientId?: string): Promise<InvoiceStats> {
  const where = clientId ? { clientId } : {};

  const [total, totalAmountResult, paidAmountResult, statusCounts, monthlyData] = await Promise.all(
    [
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
      getMonthlyRevenue(clientId),
    ]
  );

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

// ============================================
// BULK GENERATION
// ============================================

/**
 * Bulk generate invoices for multiple clients.
 * Accepts a createFn to avoid circular dependency with InvoicesService.
 */
export async function bulkGenerateInvoices(
  clientIds: string[],
  dateFrom: Date,
  dateTo: Date,
  createdBy: string,
  createFn: (data: CreateInvoiceData, createdBy: string) => Promise<any>
): Promise<{ success: boolean; generated: number; invoices: any[]; errors?: any[] }> {
  const invoices: any[] = [];
  const errors: any[] = [];

  for (const clientId of clientIds) {
    try {
      const client = await prisma.client.findUnique({ where: { id: clientId } });

      if (!client) {
        errors.push({ clientId, error: 'Client not found' });
        continue;
      }

      // Find unpaid bookings in date range
      const bookings = await prisma.booking.findMany({
        where: {
          clientId,
          createdAt: { gte: dateFrom, lte: dateTo },
          invoices: { none: { status: { notIn: ['CANCELLED'] } } },
        },
        include: { containers: true },
      });

      if (bookings.length === 0) continue;

      for (const booking of bookings) {
        try {
          const clientWithExtras = client as any;
          const dueDate = calcDueDate(clientWithExtras.paymentTerms || 30);

          const invoice = await createFn(
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
          errors.push({ clientId, bookingId: booking.id, error: error.message });
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
