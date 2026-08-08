import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const EMPTY_DATE_VALUES = new Set(['', '-']);

export function parseClaimDate(value: unknown): Dayjs | null {
  if (dayjs.isDayjs(value)) return value.isValid() ? value : null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (EMPTY_DATE_VALUES.has(normalized)) return null;

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
  return parsed ? parsed.format('DD/MM/YYYY') : '-';
}

export function isSupportedGregorianDate(value: unknown): boolean {
  const parsed = parseClaimDate(value);
  if (!parsed) return true;
  return parsed.year() >= 1900 && parsed.year() < 2400;
}
