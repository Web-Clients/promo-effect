// VAT rate for Moldova
export const VAT_RATE = 0.19;

export interface CreateInvoiceData {
  bookingId: string;
  clientId: string;
  dueDate: Date;
  notes?: string;
  discount?: number;
}

export interface UpdateInvoiceData {
  dueDate?: Date;
  notes?: string;
  discount?: number;
}

export interface PaymentData {
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface InvoiceStats {
  total: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  byStatus: {
    draft: number;
    unpaid: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  monthlyRevenue: Array<{
    month: string;
    amount: number;
    paid: number;
  }>;
}
