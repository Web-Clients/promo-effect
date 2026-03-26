/**
 * Extracts a human-readable message from an unknown caught error.
 * Handles axios responses, plain Error objects, and strings.
 */
export function getErrorMessage(err: unknown, fallback = 'A apărut o eroare'): string {
  if (err && typeof err === 'object') {
    // Axios-style response error: err.response.data.error
    const axiosErr = err as {
      response?: { data?: { error?: string; message?: string } };
      message?: string;
    };
    if (axiosErr.response?.data?.error) return axiosErr.response.data.error;
    if (axiosErr.response?.data?.message) return axiosErr.response.data.message;
    if (axiosErr.message) return axiosErr.message;
  }
  if (typeof err === 'string') return err;
  return fallback;
}

export function formatDate(date: Date | string, locale: string = 'ro'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const localeMap: Record<string, string> = { ro: 'ro-RO', ru: 'ru-RU', en: 'en-US' };
  return new Intl.DateTimeFormat(localeMap[locale] || 'ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatNumber(num: number, locale: string = 'ro'): string {
  const localeMap: Record<string, string> = { ro: 'ro-RO', ru: 'ru-RU', en: 'en-US' };
  return new Intl.NumberFormat(localeMap[locale] || 'ro-RO').format(num);
}

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'ro'
): string {
  const localeMap: Record<string, string> = { ro: 'ro-RO', ru: 'ru-RU', en: 'en-US' };
  return new Intl.NumberFormat(localeMap[locale] || 'ro-RO', {
    style: 'currency',
    currency,
  }).format(amount);
}
