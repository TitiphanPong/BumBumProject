export type SheetMutationDomain = 'claim' | 'spare';
export type SheetMutationKind = 'create' | 'update' | 'delete';

export class SheetMutationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetMutationValidationError';
  }
}

const CLAIM_FIELDS = [
  'id',
  'provinceName',
  'customerName',
  'phone',
  'address',
  'product',
  'buyProductDate',
  'problem',
  'warranty',
  'receiver',
  'receiverClaimDate',
  'inspector',
  'vehicleInspector',
  'inspectionDate',
  'inspectstatus',
  'claimSender',
  'vehicleClaim',
  'claimDate',
  'status',
  'serviceChargeStatus',
  'note',
  'image',
] as const;

const SPARE_FIELDS = [
  'id',
  'refId',
  'provinceName',
  'customerName',
  'warranty',
  'product',
  'problem',
  'part',
  'requestDate',
  'requester',
  'payer',
  'receiver',
  'receiverItemDate',
  'note',
] as const;

const FIELD_ALIASES: Record<string, string[]> = {
  provinceName: ['ProvinceName'],
  customerName: ['CustomerName'],
  phone: ['Phone'],
  address: ['Address'],
  product: ['Product'],
  buyProductDate: ['BuyProductDate'],
  problem: ['Problem'],
  warranty: ['Warranty'],
};

const ARRAY_FIELDS = new Set([
  'warranty',
  'vehicleInspector',
  'vehicleClaim',
  'serviceChargeStatus',
  'image',
]);

const DATE_FIELDS = new Set([
  'buyProductDate',
  'receiverClaimDate',
  'inspectionDate',
  'claimDate',
  'requestDate',
  'receiverItemDate',
]);

const CLAIM_CREATE_REQUIRED_FIELDS = [
  'provinceName',
  'customerName',
  'phone',
  'address',
  'problem',
  'warranty',
  'inspectstatus',
  'status',
] as const;

const CLAIM_STATUSES = new Set(['ไปเคลมเอง', 'รอเคลม', 'จบเคลม', 'ยกเลิกเคลม']);
const INSPECTION_STATUSES = new Set([
  'ไปตรวจสอบเอง',
  'รอตรวจสอบ',
  'จบการตรวจสอบ',
  'ยกเลิกการตรวจสอบ',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readCanonicalValue(record: Record<string, unknown>, key: string): unknown {
  if (hasOwn(record, key)) return record[key];

  for (const alias of FIELD_ALIASES[key] ?? []) {
    if (hasOwn(record, alias)) return record[alias];
  }

  return undefined;
}

function flattenStrings(value: unknown, field: string): string[] {
  if (value === undefined || value === null || value === '' || value === '-') return [];

  if (typeof value === 'string') {
    if (field === 'image') return [value.trim()].filter(Boolean);
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) {
    throw new SheetMutationValidationError(`${field} must be a string or string array`);
  }

  const flattened: string[] = [];
  for (const item of value.flat(2)) {
    if (item === undefined || item === null || item === '' || item === '-') continue;
    if (typeof item !== 'string') {
      throw new SheetMutationValidationError(`${field} must contain strings only`);
    }
    const trimmed = item.trim();
    if (trimmed) flattened.push(trimmed);
  }
  return flattened;
}

function validateDate(value: unknown, field: string): void {
  if (value === undefined || value === null || value === '' || value === '-') return;
  if (typeof value !== 'string') {
    throw new SheetMutationValidationError(`${field} must use YYYY-MM-DD`);
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new SheetMutationValidationError(`${field} must use YYYY-MM-DD`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    year >= 1900 &&
    year < 2400 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) {
    throw new SheetMutationValidationError(`${field} must be a valid Gregorian date`);
  }
}

function normalizeScalarEmpty(value: unknown, kind: SheetMutationKind): unknown {
  if (value === undefined || value === null || value === '' || value === '-') {
    return kind === 'update' ? '-' : '';
  }
  return value;
}

function isNonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' ? Boolean(value.trim()) && value.trim() !== '-' : value != null;
}

function validateClaimEnums(payload: Record<string, unknown>): void {
  if (isNonEmpty(payload.status) && !CLAIM_STATUSES.has(String(payload.status).trim())) {
    throw new SheetMutationValidationError('status is not supported');
  }
  if (
    isNonEmpty(payload.inspectstatus) &&
    !INSPECTION_STATUSES.has(String(payload.inspectstatus).trim())
  ) {
    throw new SheetMutationValidationError('inspectstatus is not supported');
  }
}

export function normalizeSheetMutationBody(
  input: unknown,
  domain: SheetMutationDomain,
  kind: SheetMutationKind
): Record<string, unknown> {
  if (!isRecord(input)) {
    throw new SheetMutationValidationError('Request body must be a JSON object');
  }

  const fields = domain === 'claim' ? CLAIM_FIELDS : SPARE_FIELDS;
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    const value = readCanonicalValue(input, field);
    if (value === undefined) continue;

    if (ARRAY_FIELDS.has(field)) {
      payload[field] = flattenStrings(value, field);
      continue;
    }

    const normalizedValue = normalizeScalarEmpty(value, kind);
    if (DATE_FIELDS.has(field)) validateDate(normalizedValue, field);

    if (
      typeof normalizedValue !== 'string' &&
      typeof normalizedValue !== 'number' &&
      typeof normalizedValue !== 'boolean'
    ) {
      throw new SheetMutationValidationError(`${field} has an unsupported value type`);
    }

    payload[field] = normalizedValue;
  }

  if ((kind === 'update' || kind === 'delete') && !isNonEmpty(payload.id)) {
    throw new SheetMutationValidationError('id is required');
  }

  if (domain === 'claim') {
    validateClaimEnums(payload);

    if (kind === 'create') {
      for (const field of CLAIM_CREATE_REQUIRED_FIELDS) {
        if (!isNonEmpty(payload[field])) {
          throw new SheetMutationValidationError(`${field} is required`);
        }
      }
    }
  }

  if (kind === 'delete') return { id: payload.id };
  return payload;
}
