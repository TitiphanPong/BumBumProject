import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const BUDDHIST_YEAR_OFFSET = 543;
const EMPTY_DATE_VALUES = new Set(['', '-']);

function parseBuddhistDateParts(yearText: string, month: string, day: string): Dayjs | null {
  const year = Number(yearText);
  if (year < 2400) return null;

  const parsed = dayjs(
    `${year - BUDDHIST_YEAR_OFFSET}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    'YYYY-MM-DD',
    true
  );
  return parsed.isValid() ? parsed : null;
}

export function parseClaimDate(value: unknown): Dayjs | null {
  if (dayjs.isDayjs(value)) return value.isValid() ? value : null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (EMPTY_DATE_VALUES.has(normalized)) return null;

  // Accept Buddhist Era dates entered/displayed by Thai users and normalize
  // them to Dayjs' Gregorian representation for storage and comparisons.
  const buddhistMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (buddhistMatch) {
    const [, day, month, buddhistYear] = buddhistMatch;
    const parsed = parseBuddhistDateParts(buddhistYear, month, day);
    if (parsed) return parsed;
  }

  const buddhistIsoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (buddhistIsoMatch) {
    const [, buddhistYear, month, day] = buddhistIsoMatch;
    const parsed = parseBuddhistDateParts(buddhistYear, month, day);
    if (parsed) return parsed;
  }

  for (const format of ['YYYY-MM-DD', 'D/M/YYYY', 'DD/MM/YYYY']) {
    const parsed = dayjs(normalized, format, true);
    if (parsed.isValid()) return parsed;
  }

  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed.tz(BANGKOK_TIME_ZONE) : null;
}

export function formatClaimDateForApi(value: unknown, emptyValue = ''): string {
  const parsed = parseClaimDate(value);
  return parsed ? parsed.format('YYYY-MM-DD') : emptyValue;
}

export function formatClaimDateForDisplay(value: unknown): string {
  const parsed = parseClaimDate(value);
  return parsed
    ? `${parsed.format('DD/MM')}/${parsed.year() + BUDDHIST_YEAR_OFFSET}`
    : '-';
}

export function isSupportedGregorianDate(value: unknown): boolean {
  const parsed = parseClaimDate(value);
  if (!parsed) return true;
  return parsed.year() >= 1900 && parsed.year() < 2400;
}
