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
