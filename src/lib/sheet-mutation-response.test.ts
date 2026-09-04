import { describe, expect, it } from 'vitest';
import { parseSheetMutationResponse } from './sheet-mutation-response';
import { safeErrorResponse } from './upstream';

const options = {
  successMessage: 'สำเร็จ',
  failureMessage: 'ไม่สำเร็จ',
};

describe('parseSheetMutationResponse', () => {
  it('accepts a successful Apps Script result and preserves response fields', () => {
    const result = parseSheetMutationResponse(
      JSON.stringify({ result: 'success', message: 'saved', id: 'CLAIM-42' }),
      options
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.payload).toEqual({ result: 'success', message: 'saved', id: 'CLAIM-42' });
  });

  it('maps an Apps Script business failure to HTTP 502 semantics', () => {
    const result = parseSheetMutationResponse(
      JSON.stringify({ result: 'error', message: 'record not found' }),
      options
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(result.payload).toEqual({
      result: 'error',
      message: 'record not found',
      upstream: { result: 'error', message: 'record not found' },
    });
  });

  it('rejects invalid JSON instead of treating an upstream 2xx body as success', () => {
    const result = parseSheetMutationResponse('<html>unexpected response</html>', options);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(result.payload.result).toBe('error');
  });

  it('keeps the legacy plain-text success fallback only when explicitly enabled', () => {
    const result = parseSheetMutationResponse('Saved successfully', {
      ...options,
      allowPlainTextSuccess: true,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });
});

describe('safeErrorResponse', () => {
  it('maps an upstream timeout to HTTP 504', async () => {
    const response = safeErrorResponse(new DOMException('timed out', 'TimeoutError'), 'mutation');

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({ error: 'mutation' });
  });
});
