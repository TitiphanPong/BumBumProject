import { describe, expect, it } from 'vitest';
import { buildUpstreamReadUrl, isPaginatedResponse } from './upstream-query';

describe('buildUpstreamReadUrl', () => {
  it('forwards only supported read parameters and fixes the route sheet name', () => {
    const request = new Request(
      'http://localhost/api/get-claim?page=2&limit=20&status=pending&inspectstatus=waiting&sort=claimPriority&direction=desc&sheetName=wrong&unsafe=x'
    );
    const url = new URL(buildUpstreamReadUrl('https://example.test/exec', 'ใบเคลม', request));

    expect(url.searchParams.get('sheetName')).toBe('ใบเคลม');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('status')).toBe('pending');
    expect(url.searchParams.get('inspectstatus')).toBe('waiting');
    expect(url.searchParams.get('sort')).toBe('claimPriority');
    expect(url.searchParams.get('direction')).toBe('desc');
    expect(url.searchParams.has('unsafe')).toBe(false);
  });
});

describe('isPaginatedResponse', () => {
  it('accepts the documented pagination shape', () => {
    expect(
      isPaginatedResponse({ items: [], page: 1, limit: 20, total: 0, totalPages: 0 })
    ).toBe(true);
    expect(isPaginatedResponse([])).toBe(false);
  });
});
