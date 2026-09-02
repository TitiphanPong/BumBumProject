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
