import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { describe, expect, it } from 'vitest';
import { normalizeBuddhistDateFormats, normalizeBuddhistDateInput } from './buddhist-date';

dayjs.extend(customParseFormat);

function parseTypedDate(value: string) {
  return dayjs(
    normalizeBuddhistDateInput(value),
    normalizeBuddhistDateFormats(['DD/MM/BBBB']),
    true
  );
}

describe('Buddhist Era DatePicker input', () => {
  it('parses a past Buddhist Era year as Gregorian', () => {
    expect(parseTypedDate('23/02/2565').format('YYYY-MM-DD')).toBe('2022-02-23');
  });

  it('parses the current Buddhist Era year as Gregorian', () => {
    expect(parseTypedDate('23/02/2569').format('YYYY-MM-DD')).toBe('2026-02-23');
  });

  it('accepts a valid Buddhist Era leap day', () => {
    expect(parseTypedDate('29/02/2567').format('YYYY-MM-DD')).toBe('2024-02-29');
  });

  it('rejects invalid calendar dates', () => {
    expect(parseTypedDate('31/02/2565').isValid()).toBe(false);
    expect(parseTypedDate('29/02/2566').isValid()).toBe(false);
  });

  it('leaves unsupported input unchanged for the picker parser to reject', () => {
    expect(normalizeBuddhistDateInput('not-a-date')).toBe('not-a-date');
  });
});
