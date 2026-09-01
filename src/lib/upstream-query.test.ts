import { describe, expect, it } from 'vitest';
import {
  buildUpstreamReadUrl,
  isClaimAggregateResponse,
  isPaginatedResponse,
} from './upstream-query';

describe('buildUpstreamReadUrl', () => {
  it('forwards only supported read parameters and fixes the route sheet name', () => {
    const request = new Request(
      'http://localhost/api/get-claim?page=2&limit=20&id=CLAIM-42&status=pending&inspectstatus=waiting&sort=claimPriority&direction=desc&sheetName=wrong&unsafe=x'
    );
    const url = new URL(buildUpstreamReadUrl('https://example.test/exec', 'ใบเคลม', request));

    expect(url.searchParams.get('sheetName')).toBe('ใบเคลม');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('id')).toBe('CLAIM-42');
    expect(url.searchParams.get('status')).toBe('pending');
    expect(url.searchParams.get('inspectstatus')).toBe('waiting');
    expect(url.searchParams.get('sort')).toBe('claimPriority');
    expect(url.searchParams.get('direction')).toBe('desc');
    expect(url.searchParams.has('unsafe')).toBe(false);
  });

  it('forwards aggregate, date, province and claimer filters', () => {
    const request = new Request(
      'http://localhost/api/get-claim?aggregate=claimPerson&dateFrom=2026-09-01&dateTo=2026-09-30&provinceName=%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%AF&claimerName=%E0%B8%99%E0%B8%A3%E0%B8%B4%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B9%8C'
    );
    const url = new URL(buildUpstreamReadUrl('https://example.test/exec', 'ใบเคลม', request));

    expect(url.searchParams.get('aggregate')).toBe('claimPerson');
    expect(url.searchParams.get('dateFrom')).toBe('2026-09-01');
    expect(url.searchParams.get('dateTo')).toBe('2026-09-30');
    expect(url.searchParams.get('provinceName')).toBe('กรุงเทพฯ');
    expect(url.searchParams.get('claimerName')).toBe('นรินทร์');
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

describe('isClaimAggregateResponse', () => {
  it('accepts only supported claim aggregate discriminators', () => {
    expect(isClaimAggregateResponse({ aggregateApplied: 'dashboard', stats: {} })).toBe(true);
    expect(isClaimAggregateResponse({ aggregateApplied: 'claimPerson', metrics: {} })).toBe(true);
    expect(isClaimAggregateResponse({ aggregateApplied: 'unknown' })).toBe(false);
    expect(isClaimAggregateResponse({ items: [] })).toBe(false);
    expect(isClaimAggregateResponse(null)).toBe(false);
  });
});
