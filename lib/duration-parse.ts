const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export interface DateRange {
  start: Date;
  end: Date;
}

/** Expand range by N calendar months on each side (default ±1 month). */
export function expandRange(range: DateRange, bufferMonths = 1): DateRange {
  const start = new Date(range.start);
  const end = new Date(range.end);
  start.setMonth(start.getMonth() - bufferMonths);
  end.setMonth(end.getMonth() + bufferMonths);
  return { start, end };
}

export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

function parseMonthYear(text: string): { year: number; month: number } | null {
  const trimmed = text.trim().toLowerCase();
  const present = /\b(present|current|ongoing|now)\b/.test(trimmed);
  if (present) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  const mmyyyy = trimmed.match(/([a-z]{3,9})\s*['']?(\d{2,4})|(\d{1,2})[\/\-](\d{2,4})/);
  if (mmyyyy) {
    const monthKey = (mmyyyy[1] ?? '').slice(0, 3);
    const month = MONTHS[monthKey] ?? MONTHS[(mmyyyy[1] ?? '').toLowerCase()];
    let year = parseInt(mmyyyy[2] ?? mmyyyy[4] ?? '', 10);
    if (Number.isNaN(year)) return null;
    if (year < 100) year += year < 50 ? 2000 : 1900;
    if (month === undefined) return null;
    return { year, month };
  }

  const yyyymm = trimmed.match(/(\d{4})[\/\-](\d{1,2})/);
  if (yyyymm) {
    return { year: parseInt(yyyymm[1], 10), month: parseInt(yyyymm[2], 10) - 1 };
  }

  const yearOnly = trimmed.match(/\b(19|20)\d{2}\b/);
  if (yearOnly) {
    const year = parseInt(yearOnly[0], 10);
    return { year, month: 0 };
  }

  return null;
}

function toRange(start: { year: number; month: number }, end: { year: number; month: number }): DateRange {
  return {
    start: new Date(start.year, start.month, 1),
    end: endOfMonth(end.year, end.month),
  };
}

/**
 * Parse free-text duration (e.g. "Jan 2020 – Mar 2022", "2020-2022") into a date range.
 */
export function parseDurationText(duration: string | null | undefined): DateRange | null {
  if (!duration?.trim()) return null;

  const normalized = duration
    .replace(/[–—−]/g, '-')
    .replace(/\s+to\s+/gi, ' - ')
    .trim();

  const parts = normalized.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const start = parseMonthYear(parts[0]);
    const end = parseMonthYear(parts[parts.length - 1]);
    if (start && end) return toRange(start, end);
  }

  const single = parseMonthYear(normalized);
  if (single) return toRange(single, single);

  const years = [...normalized.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => parseInt(m[0], 10));
  if (years.length >= 2) {
    return toRange({ year: years[0], month: 0 }, { year: years[years.length - 1], month: 11 });
  }
  if (years.length === 1) {
    return toRange({ year: years[0], month: 0 }, { year: years[0], month: 11 });
  }

  return null;
}

export function formatDateRange(range: DateRange): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}
