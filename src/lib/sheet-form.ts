import type { SheetFormValues } from './sheet-types';

export function replaceEmptySheetValuesWithDash(values: SheetFormValues): SheetFormValues {
  const normalized: SheetFormValues = {};

  for (const [key, value] of Object.entries(values)) {
    normalized[key] =
      value === '' || value === null || value === undefined ||
      (Array.isArray(value) && value.length === 0)
        ? '-'
        : value;
  }

  return normalized;
}
