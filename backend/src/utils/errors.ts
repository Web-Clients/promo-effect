/**
 * Standardised application error format.
 * Task C14 — Phase C Code Quality.
 *
 * Usage:
 *   throw new AppError('BOOKING_NOT_FOUND', 'Booking not found', 404);
 *   throw new AppError('VALIDATION_FAILED', 'Invalid input', 400, { field: 'containerNumber' });
 */

// ─── Error codes ─────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',

  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',

  // Bookings
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  BOOKING_ALREADY_CANCELLED: 'BOOKING_ALREADY_CANCELLED',
  BOOKING_CANNOT_MODIFY: 'BOOKING_CANNOT_MODIFY',
  BOOKING_ACCESS_DENIED: 'BOOKING_ACCESS_DENIED',

  // Invoices
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  INVOICE_ALREADY_PAID: 'INVOICE_ALREADY_PAID',
  INVOICE_ALREADY_CANCELLED: 'INVOICE_ALREADY_CANCELLED',

  // Containers
  CONTAINER_NOT_FOUND: 'CONTAINER_NOT_FOUND',
  CONTAINER_ALREADY_EXISTS: 'CONTAINER_ALREADY_EXISTS',

  // Clients
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  CLIENT_EMAIL_TAKEN: 'CLIENT_EMAIL_TAKEN',

  // Users
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EMAIL_TAKEN: 'USER_EMAIL_TAKEN',

  // Files
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',

  // Payments
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',

  // Email
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',

  // Calculator / Pricing
  PRICE_NOT_FOUND: 'PRICE_NOT_FOUND',
  PRICE_EXPIRED: 'PRICE_EXPIRED',
  HS_CODE_NOT_FOUND: 'HS_CODE_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─── AppError class ───────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    public override readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: object
  ) {
    super(message);
    this.name = 'AppError';
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

// ─── Convenience factory functions ───────────────────────────────────────────

export const notFound = (resource: string, id?: string): AppError =>
  new AppError(
    ERROR_CODES.NOT_FOUND,
    id ? `${resource} with id "${id}" not found` : `${resource} not found`,
    404
  );

export const unauthorized = (message = 'Authentication required'): AppError =>
  new AppError(ERROR_CODES.UNAUTHORIZED, message, 401);

export const forbidden = (message = 'Insufficient permissions'): AppError =>
  new AppError(ERROR_CODES.INSUFFICIENT_PERMISSIONS, message, 403);

export const validationFailed = (message: string, details?: object): AppError =>
  new AppError(ERROR_CODES.VALIDATION_FAILED, message, 400, details);

export const conflict = (message: string): AppError =>
  new AppError(ERROR_CODES.CONFLICT, message, 409);
