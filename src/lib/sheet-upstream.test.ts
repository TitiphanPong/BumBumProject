import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSheetMutationResponse } from './sheet-mutation-response';
import { handleSheetPostRequest } from './sheet-upstream';

const mutationResponse = (response: Response) =>
  response.text().then(text =>
    createSheetMutationResponse(text, {
      successMessage: 'saved',
      failureMessage: 'failed',
    })
  );

function requestWithBody(body: string): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('handleSheetPostRequest mutation boundary', () => {
  it('forces route-owned sheet/action and drops unknown fields', async () => {
    vi.stubEnv('GOOGLE_SCRIPT_URL', 'https://example.com/apps-script');
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({ result: 'success' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await handleSheetPostRequest(
      requestWithBody(
        JSON.stringify({
          ProvinceName: 'กรุงเทพฯ',
          CustomerName: 'ลูกค้า',
          Phone: '0812345678',
          Address: 'Bangkok',
          Problem: 'เปิดไม่ติด',
          Warranty: ['อยู่ในประกัน'],
          inspectstatus: 'รอตรวจสอบ',
          status: 'รอเคลม',
          action: 'delete',
          sheetName: 'ราคาอะไหล่และมอเตอร์',
          dangerous: 'ignored',
        })
      ),
      'ใบเคลม',
      'submit claim',
      { action: 'add', mutation: { domain: 'claim', kind: 'create' } },
      mutationResponse
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init).toBeDefined();
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload.sheetName).toBe('ใบเคลม');
    expect(payload.action).toBe('add');
    expect(payload.provinceName).toBe('กรุงเทพฯ');
    expect(payload.customerName).toBe('ลูกค้า');
    expect(payload).not.toHaveProperty('dangerous');
  });

  it('returns a 400 error envelope for validation failures without calling upstream', async () => {
    vi.stubEnv('GOOGLE_SCRIPT_URL', 'https://example.com/apps-script');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await handleSheetPostRequest(
      requestWithBody(JSON.stringify({ id: '', action: 'delete' })),
      'ใบเคลม',
      'update claim',
      { action: 'update', mutation: { domain: 'claim', kind: 'update' } },
      mutationResponse
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ result: 'error', message: 'id is required' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a 400 error envelope for invalid request JSON', async () => {
    const response = await handleSheetPostRequest(
      requestWithBody('{invalid-json'),
      'ใบเคลม',
      'submit claim',
      { action: 'add', mutation: { domain: 'claim', kind: 'create' } },
      mutationResponse
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      result: 'error',
      message: 'Request body must be valid JSON',
    });
  });

  it('returns a 504 error envelope when Apps Script times out', async () => {
    vi.stubEnv('GOOGLE_SCRIPT_URL', 'https://example.com/apps-script');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('timed out', 'TimeoutError');
      })
    );

    const response = await handleSheetPostRequest(
      requestWithBody(
        JSON.stringify({
          id: 'SPAREPART-42',
          requestDate: '2026-09-08',
        })
      ),
      'เบิกอะไหล่',
      'update spare part',
      { action: 'update', mutation: { domain: 'spare', kind: 'update' } },
      mutationResponse
    );

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      result: 'error',
      message: 'Apps Script request timed out',
    });
  });
});
