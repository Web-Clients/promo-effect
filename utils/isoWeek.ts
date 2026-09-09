/**
 * ISO 8601 week numbers.
 *
 * Chinese agents quote in weeks — "rata 3.000 USD / wk 24" — and Ion described
 * the cost of that plainly on 8 Sep: "Apoi eu trebuie să caut prin calendar,
 * care-i săptămâna 24 la noi aicea? Nu-i. Se începe pe Google să găsesc care-i
 * săptămâna." So the platform shows the week beside every date and accepts a
 * week where it accepts a date.
 *
 * ISO 8601, not "the nth Sunday": weeks start on Monday and week 1 is the one
 * containing the year's first Thursday. That is the convention shipping uses,
 * and it is why a date in late December can belong to week 1 of the next year.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC on the same calendar day, so arithmetic ignores time zones. */
function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * The Thursday of the week containing `date`.
 *
 * Everything else falls out of this: ISO weeks are numbered by which year their
 * Thursday lands in, which is what makes 31 December 2024 belong to week 1 of
 * 2025.
 */
function isoThursday(date: Date): Date {
  const d = utcMidnight(date);
  // getUTCDay: Sunday is 0. Shift so Monday is 1 and Sunday is 7.
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  return d;
}

/** The ISO week number, 1–53. */
export function isoWeek(date: Date): number {
  const thursday = isoThursday(date);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.ceil(((thursday.getTime() - jan1.getTime()) / DAY_MS + 1) / 7);
}

/** The year the week belongs to, which is not always the date's own year. */
export function isoWeekYear(date: Date): number {
  return isoThursday(date).getUTCFullYear();
}

/** "W24" / "W24 2027" when the week's year differs from the current one. */
export function formatWeek(date: Date, referenceYear?: number): string {
  const week = isoWeek(date);
  const year = isoWeekYear(date);
  const ref = referenceYear ?? new Date().getUTCFullYear();
  return year === ref ? `W${week}` : `W${week} ${year}`;
}

/** Monday and Sunday of a given ISO week, both at midnight UTC. */
export function isoWeekRange(year: number, week: number): { start: Date; end: Date } {
  // 4 January is always in week 1, by definition.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * DAY_MS);
  const start = new Date(week1Monday.getTime() + (week - 1) * 7 * DAY_MS);
  return { start, end: new Date(start.getTime() + 6 * DAY_MS) };
}

/**
 * Read a week out of what someone typed.
 *
 * Accepts the forms agents actually send — "wk 24", "W24", "week 24", "нед 24",
 * "24周", or a bare number — and nothing that merely contains a number, so a
 * date pasted into the same box is not silently read as a week.
 *
 * Returns null when the text is not a week, or when the number is not a
 * plausible one: there is no week 0 and no week 54.
 */
export function parseWeek(input: string, year?: number): { week: number; year: number } | null {
  const text = (input || '').trim();
  if (!text) return null;

  const patterns = [
    /^w(?:k|eek)?\s*[.:-]?\s*(\d{1,2})(?:\s*[/,-]\s*(\d{4}))?$/i, // wk 24, W24, week 24, W24/2027
    /^нед(?:еля)?\.?\s*(\d{1,2})(?:\s*[/,-]\s*(\d{4}))?$/i, // нед 24
    /^(\d{1,2})\s*(?:周|周次)$/, // 24周
    /^(\d{1,2})$/, // a bare 24
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const week = Number(m[1]);
    if (!Number.isInteger(week) || week < 1 || week > 53) return null;
    const resolved = m[2] ? Number(m[2]) : (year ?? new Date().getUTCFullYear());
    // Week 53 exists only in long years; reject it where it does not.
    if (week === 53 && weeksInYear(resolved) < 53) return null;
    return { week, year: resolved };
  }
  return null;
}

/** 52 or 53, depending on where the year's days fall. */
export function weeksInYear(year: number): number {
  return isoWeek(new Date(Date.UTC(year, 11, 28))); // 28 Dec is always in the last week
}

/** The Monday of a week, for turning "wk 24" into a date the form can store. */
export function weekToDate(week: number, year: number): Date {
  return isoWeekRange(year, week).start;
}
