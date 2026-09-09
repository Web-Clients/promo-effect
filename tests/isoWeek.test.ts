/**
 * ISO week numbers.
 *
 * Chinese agents quote in weeks. Ion described what that costs him on 8 Sep:
 * "Apoi eu trebuie să caut prin calendar, care-i săptămâna 24 la noi aicea?
 * Nu-i. Se începe pe Google să găsesc care-i săptămâna."
 *
 * The cases below are the ones that separate ISO 8601 from counting Sundays:
 * a week belongs to the year its Thursday falls in, so the end of December can
 * be week 1 of the next year and the start of January can be week 52 or 53 of
 * the previous one.
 */

import { describe, it, expect } from 'vitest';
import {
  isoWeek,
  isoWeekYear,
  isoWeekRange,
  parseWeek,
  weeksInYear,
  weekToDate,
  formatWeek,
} from '../utils/isoWeek';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('isoWeek', () => {
  it('numbers an ordinary mid-year date', () => {
    // 8 September 2026 is a Tuesday in week 37.
    expect(isoWeek(d('2026-09-08'))).toBe(37);
  });

  it('starts the week on Monday, not Sunday', () => {
    // Sunday 13 Sep still belongs to week 37; Monday 14 Sep starts week 38.
    expect(isoWeek(d('2026-09-13'))).toBe(37);
    expect(isoWeek(d('2026-09-14'))).toBe(38);
  });

  it('puts late December into next year week 1 when the Thursday lands there', () => {
    // 31 Dec 2024 is a Tuesday; its Thursday is 2 Jan 2025.
    expect(isoWeek(d('2024-12-31'))).toBe(1);
    expect(isoWeekYear(d('2024-12-31'))).toBe(2025);
  });

  it('puts early January into the previous year last week when it belongs there', () => {
    // 1 Jan 2027 is a Friday; its Thursday is 31 Dec 2026.
    expect(isoWeek(d('2027-01-01'))).toBe(53);
    expect(isoWeekYear(d('2027-01-01'))).toBe(2026);
  });

  it('4 January is always in week 1, by definition', () => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      expect(isoWeek(new Date(Date.UTC(year, 0, 4)))).toBe(1);
    }
  });
});

describe('weeksInYear', () => {
  it('knows which years are long', () => {
    expect(weeksInYear(2026)).toBe(53);
    expect(weeksInYear(2025)).toBe(52);
    expect(weeksInYear(2024)).toBe(52);
  });
});

describe('isoWeekRange', () => {
  it('runs Monday to Sunday', () => {
    const { start, end } = isoWeekRange(2026, 37);
    expect(start.toISOString().slice(0, 10)).toBe('2026-09-07');
    expect(end.toISOString().slice(0, 10)).toBe('2026-09-13');
    expect(start.getUTCDay()).toBe(1); // Monday
    expect(end.getUTCDay()).toBe(0); // Sunday
  });

  it('round-trips with isoWeek', () => {
    for (const week of [1, 12, 26, 37, 52]) {
      expect(isoWeek(isoWeekRange(2026, week).start)).toBe(week);
    }
  });
});

describe('parseWeek', () => {
  it('reads the forms agents actually send', () => {
    for (const text of ['wk 24', 'WK24', 'W24', 'w 24', 'week 24', 'Week: 24', '24']) {
      expect(parseWeek(text, 2026)).toEqual({ week: 24, year: 2026 });
    }
  });

  it('reads a Russian and a Chinese form', () => {
    expect(parseWeek('нед 24', 2026)).toEqual({ week: 24, year: 2026 });
    expect(parseWeek('24周', 2026)).toEqual({ week: 24, year: 2026 });
  });

  it('takes an explicit year when one is given', () => {
    expect(parseWeek('W24/2027')).toEqual({ week: 24, year: 2027 });
  });

  it('refuses a week that does not exist', () => {
    expect(parseWeek('W0', 2026)).toBeNull();
    expect(parseWeek('W54', 2026)).toBeNull();
    // 2025 is a 52-week year, so W53 is not a real week there.
    expect(parseWeek('W53', 2025)).toBeNull();
    expect(parseWeek('W53', 2026)).toEqual({ week: 53, year: 2026 });
  });

  it('does not read a date as a week', () => {
    // The danger case: a date pasted into the same box must be rejected, not
    // silently taken as week 15.
    expect(parseWeek('15.09.2026')).toBeNull();
    expect(parseWeek('2026-09-15')).toBeNull();
    expect(parseWeek('sailing 24 September')).toBeNull();
  });

  it('returns null on empty or nonsense input', () => {
    expect(parseWeek('')).toBeNull();
    expect(parseWeek('   ')).toBeNull();
    expect(parseWeek('asap')).toBeNull();
  });
});

describe('weekToDate', () => {
  it('gives the Monday, so a week can be stored as a date', () => {
    expect(weekToDate(24, 2026).toISOString().slice(0, 10)).toBe('2026-06-08');
  });
});

describe('formatWeek', () => {
  it('shows the bare week within the current year', () => {
    expect(formatWeek(d('2026-09-08'), 2026)).toBe('W37');
  });

  it('adds the year when the week belongs to a different one', () => {
    expect(formatWeek(d('2024-12-31'), 2024)).toBe('W1 2025');
  });
});
