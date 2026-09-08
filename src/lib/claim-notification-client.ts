export async function sendClaimNotification(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch('/api/notify-claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok) return;

  const result = await response.json().catch(() => null);
  throw new Error(result?.message || result?.error || 'Notification request failed');
}

export type ClaimNotificationAttempt =
  | { ok: true }
  | { ok: false; message: string };

export async function trySendClaimNotification(
  payload: Record<string, unknown>
): Promise<ClaimNotificationAttempt> {
  try {
    await sendClaimNotification(payload);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Notification request failed',
    };
  }
}
