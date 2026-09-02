import type { SheetRow } from './sheet-types';

type SheetRowFilters = {
  province?: string;
  search?: string;
  status?: string;
  inspectStatus?: string;
};

function getSheetRowProvince(row: SheetRow): string {
  const province = row.ProvinceName || row.provinceName;
  return typeof province === 'string' ? province.trim() : '';
}

export function getSheetProvinceOptions(rows: SheetRow[]): string[] {
  return Array.from(new Set(rows.map(getSheetRowProvince).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'th')
  );
}

export function filterSheetRows(rows: SheetRow[], filters: SheetRowFilters): SheetRow[] {
  const search = filters.search?.toLowerCase().trim() || '';

  return rows.filter(row => {
    if (
      filters.province &&
      filters.province !== 'ทั้งหมด' &&
      getSheetRowProvince(row) !== filters.province
    ) {
      return false;
    }

    if (filters.status && filters.status !== 'ทั้งหมด' && row.status !== filters.status) {
      return false;
    }

    if (
      filters.inspectStatus &&
      filters.inspectStatus !== 'ทั้งหมด' &&
      row.inspectstatus !== filters.inspectStatus
    ) {
      return false;
    }

    if (!search) return true;
    return Object.values(row).some(
      value => typeof value === 'string' && value.toLowerCase().includes(search)
    );
  });
}

export function withFallbackSheetRowIds(rows: SheetRow[], offset = 0): SheetRow[] {
  return rows.map((row, index) => ({
    ...row,
    id: row.id?.trim() || `row-${offset + index}`,
  }));
}
