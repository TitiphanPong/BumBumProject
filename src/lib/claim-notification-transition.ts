export type ClaimUpdateNotificationType =
  | 'จบเคลม'
  | 'จบการตรวจสอบ'
  | 'อัปเดตรายการเคลม';

interface ClaimStatusSnapshot {
  status?: unknown;
  inspectstatus?: unknown;
}

function normalizeStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getClaimUpdateNotificationType(
  previous: ClaimStatusSnapshot,
  next: ClaimStatusSnapshot
): ClaimUpdateNotificationType {
  const previousClaimStatus = normalizeStatus(previous.status);
  const nextClaimStatus = normalizeStatus(next.status);
  const previousInspectStatus = normalizeStatus(previous.inspectstatus);
  const nextInspectStatus = normalizeStatus(next.inspectstatus);

  if (nextClaimStatus === 'จบเคลม' && previousClaimStatus !== 'จบเคลม') {
    return 'จบเคลม';
  }

  if (
    nextClaimStatus !== 'จบเคลม' &&
    nextInspectStatus === 'จบการตรวจสอบ' &&
    previousInspectStatus !== 'จบการตรวจสอบ'
  ) {
    return 'จบการตรวจสอบ';
  }

  return 'อัปเดตรายการเคลม';
}
