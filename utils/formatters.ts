/**
 * Returns Tailwind classes for a booking/container status badge.
 * Centralised here so AdminDashboard, BookingsTable, etc. share one source.
 */
export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400';
    case 'IN_TRANSIT':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400';
  }
}

/**
 * Maps backend AppError codes to user-friendly Romanian messages.
 * Extend as new error codes are added.
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND: 'Rezervarea nu a fost găsită.',
  INVOICE_NOT_FOUND: 'Factura nu a fost găsită.',
  CONTAINER_NOT_FOUND: 'Containerul nu a fost găsit.',
  CLIENT_NOT_FOUND: 'Clientul nu a fost găsit.',
  USER_NOT_FOUND: 'Utilizatorul nu a fost găsit.',
  UNAUTHORIZED: 'Sesiunea a expirat. Vă rugăm să vă autentificați din nou.',
  INSUFFICIENT_PERMISSIONS: 'Nu aveți permisiunea necesară.',
  VALIDATION_FAILED: 'Datele introduse sunt invalide.',
  CONFLICT: 'Există deja o intrare cu aceste date.',
  BOOKING_ALREADY_CANCELLED: 'Rezervarea a fost deja anulată.',
  INVOICE_ALREADY_PAID: 'Factura a fost deja achitată.',
  CONTAINER_ALREADY_EXISTS: 'Containerul există deja în baza de date.',
  CLIENT_EMAIL_TAKEN: 'Adresa de email este deja folosită.',
  USER_EMAIL_TAKEN: 'Adresa de email este deja folosită.',
  RATE_LIMITED: 'Prea multe cereri. Vă rugăm așteptați.',
  EMAIL_SEND_FAILED: 'Emailul nu a putut fi trimis.',
  FILE_TOO_LARGE: 'Fișierul este prea mare.',
  FILE_TYPE_NOT_ALLOWED: 'Tipul de fișier nu este permis.',
};

/**
 * Extracts a human-readable message from an unknown caught error.
 * Handles:
 *   - AppError format: { success: false, error: { code, message } }
 *   - Axios responses with error/message in data
 *   - Plain Error objects
 *   - Strings
 */
export function getErrorMessage(err: unknown, fallback = 'A apărut o eroare'): string {
  if (err && typeof err === 'object') {
    const axiosErr = err as {
      response?: {
        data?: {
          // AppError format (C14)
          error?: { code?: string; message?: string } | string;
          // Legacy format
          message?: string;
        };
      };
      message?: string;
    };

    const data = axiosErr.response?.data;
    if (data) {
      // AppError standard format: { error: { code, message } }
      if (data.error && typeof data.error === 'object') {
        const code = data.error.code;
        if (code && ERROR_CODE_MESSAGES[code]) return ERROR_CODE_MESSAGES[code];
        if (data.error.message) return data.error.message;
      }
      // Legacy format: { error: "string" }
      if (typeof data.error === 'string') return data.error;
      // Legacy: { message: "..." }
      if (data.message) return data.message;
    }

    if (axiosErr.message) return axiosErr.message;
  }
  if (typeof err === 'string') return err;
  return fallback;
}

const LOCALE_MAP: Record<string, string> = { ro: 'ro-RO', ru: 'ru-RU', en: 'en-US' };

export function formatDate(date: Date | string, locale: string = 'ro'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_MAP[locale] || 'ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateShort(date: Date | string, locale: string = 'ro'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_MAP[locale] || 'ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string, locale: string = 'ro'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE_MAP[locale] || 'ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelative(date: Date | string, locale: string = 'ro'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const labels: Record<string, Record<string, string>> = {
    ro: { now: 'acum', min: 'min', hour: 'h', day: 'zile', ago: 'în urmă' },
    ru: { now: 'сейчас', min: 'мин', hour: 'ч', day: 'дней', ago: 'назад' },
    en: { now: 'now', min: 'min', hour: 'h', day: 'days', ago: 'ago' },
  };
  const l = labels[locale] || labels.ro;

  if (diffMins < 1) return l.now;
  if (diffMins < 60) return `${diffMins} ${l.min} ${l.ago}`;
  if (diffHours < 24) return `${diffHours} ${l.hour} ${l.ago}`;
  if (diffDays < 30) return `${diffDays} ${l.day} ${l.ago}`;
  return formatDateShort(d, locale);
}

export function formatNumber(num: number, locale: string = 'ro'): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale] || 'ro-RO').format(num);
}

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'ro'
): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale] || 'ro-RO', {
    style: 'currency',
    currency,
  }).format(amount);
}
