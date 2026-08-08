import { describe, expect, it } from 'vitest';
import {
  formatClaimDateForApi,
  formatClaimDateForDisplay,
  isSupportedGregorianDate,
  parseClaimDate,
} from './claim-date';

describe('claim date normalization', () => {
  it('keeps the canonical API date format', () => {
    expect(formatClaimDateForApi('2026-06-22')).toBe('2026-06-22');
  });

  it('parses legacy Thai display dates', () => {
    expect(formatClaimDateForApi('22/06/2026')).toBe('2026-06-22');
  });

  it('converts Google Sheets ISO timestamps using Bangkok time', () => {
    expect(formatClaimDateForApi('2026-06-21T17:00:00.000Z')).toBe('2026-06-22');
    expect(formatClaimDateForDisplay('2026-06-21T17:00:00.000Z')).toBe('22/06/2026');
  });

  it('treats dash and empty values as missing dates', () => {
    expect(parseClaimDate('-')).toBeNull();
    expect(formatClaimDateForDisplay('')).toBe('-');
  });

  it('rejects Buddhist years entered as Gregorian years', () => {
    expect(isSupportedGregorianDate('2026-06-22')).toBe(true);
    expect(isSupportedGregorianDate('2569-06-22')).toBe(false);
  });
});
