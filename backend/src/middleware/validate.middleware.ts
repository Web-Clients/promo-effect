import { z } from 'zod';

// ===== AUTH SCHEMAS =====

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: z.string().optional(),
});

// ===== BOOKING SCHEMAS =====

export const createBookingSchema = z.object({
  clientId: z.string().optional(),
  agentId: z.string().optional(),
  priceId: z.string().optional(),
  portOrigin: z.string().min(1, 'Port of origin is required'),
  portDestination: z.string().optional(),
  containerType: z.string().min(1, 'Container type is required'),
  cargoCategory: z.string().min(1, 'Cargo category is required'),
  cargoWeight: z.string().min(1, 'Cargo weight is required'),
  cargoReadyDate: z.string().min(1, 'Cargo ready date is required'),
  shippingLine: z.string().optional(),
  freightPrice: z.number().optional(),
  portTaxes: z.number().optional(),
  customsTaxes: z.number().optional(),
  terrestrialTransport: z.number().optional(),
  commission: z.number().optional(),
  totalPrice: z.number().optional(),
  supplierName: z.string().optional(),
  supplierPhone: z.string().optional(),
  supplierEmail: z.string().email('Invalid supplier email').optional().or(z.literal('')),
  supplierAddress: z.string().optional(),
  departureDate: z.string().optional(),
  eta: z.string().optional(),
  internalNotes: z.string().optional(),
  clientNotes: z.string().optional(),
});

// ===== CLIENT SCHEMAS =====

export const createClientSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(6, 'Phone number must be at least 6 characters'),
  address: z.string().optional(),
  taxId: z.string().optional(),
  bankAccount: z.string().optional(),
});

export const updateClientSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').optional(),
  contactPerson: z.string().min(2, 'Contact person must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(6, 'Phone number must be at least 6 characters').optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  bankAccount: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

// ===== INVOICE SCHEMAS =====

export const createInvoiceSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  discount: z
    .number()
    .min(0, 'Discount must be >= 0')
    .max(100, 'Discount must be <= 100')
    .optional(),
});

export const markPaidSchema = z.object({
  amount: z.number().positive('Valid payment amount is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER'], {
    errorMap: () => ({
      message: 'Payment method must be one of: BANK_TRANSFER, CASH, CARD, OTHER',
    }),
  }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
