const BUDDHIST_YEAR_OFFSET = 543;

const BUDDHIST_DATE_INPUT = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Converts a typed Thai Buddhist Era date to the equivalent Gregorian text.
 * Date validity is intentionally left to rc-picker/Day.js' strict parser.
 */
export function normalizeBuddhistDateInput(value: string): string {
  const match = value.trim().match(BUDDHIST_DATE_INPUT);
  if (!match) return value;

  const [, day, month, yearText] = match;
  const year = Number(yearText);
  if (year < 2400) return value;

  return `${day}/${month}/${year - BUDDHIST_YEAR_OFFSET}`;
}

export function normalizeBuddhistDateFormats(formats: string[]): string[] {
  return formats.map(format => format.replace(/BBBB/g, 'YYYY'));
}
