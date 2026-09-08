import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendClaimNotification, trySendClaimNotification } from './claim-notification-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('claim notification client', () => {
  it('resolves when the notification endpoint succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));

    await expect(sendClaimNotification({ notifyType: 'แจ้งเคลมสินค้า' })).resolves.toBeUndefined();
    await expect(trySendClaimNotification({ notifyType: 'แจ้งเคลมสินค้า' })).resolves.toEqual({
      ok: true,
    });
  });

  it('returns a failure result instead of throwing when Telegram notification fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ message: 'Telegram unavailable' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    await expect(trySendClaimNotification({ notifyType: 'จบเคลม' })).resolves.toEqual({
      ok: false,
      message: 'Telegram unavailable',
    });
  });

  it('converts network failures to a non-throwing notification result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      })
    );

    await expect(trySendClaimNotification({ notifyType: 'จบการตรวจสอบ' })).resolves.toEqual({
      ok: false,
      message: 'network down',
    });
  });
});
