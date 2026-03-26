import { InvoiceStatus } from '../../services/invoices';

export const statusVariantMap: Record<
  InvoiceStatus,
  'green' | 'red' | 'blue' | 'yellow' | 'default'
> = {
  PAID: 'green',
  OVERDUE: 'red',
  UNPAID: 'yellow',
  SENT: 'blue',
  DRAFT: 'default',
  CANCELLED: 'default',
};

export const statusTextMap: Record<InvoiceStatus, string> = {
  PAID: 'Achitată',
  OVERDUE: 'Scadentă',
  UNPAID: 'Neachitată',
  SENT: 'Trimisă',
  DRAFT: 'Ciornă',
  CANCELLED: 'Anulată',
};
