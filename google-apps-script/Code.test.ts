import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type SheetValue = string | number | Date;

function createRuntime(rows: SheetValue[][]) {
  const cache = new Map<string, string>();
  const properties = new Map<string, string>();
  const rangeReads: Array<[number, number, number, number]> = [];
  let dataRangeReads = 0;

  const sheet = {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0]?.length ?? 0,
    getDataRange: () => ({
      getValues: () => {
        dataRangeReads += 1;
        return rows.map(values => [...values]);
      },
    }),
    getRange: (row: number, column: number, rowCount: number, columnCount: number) => {
      rangeReads.push([row, column, rowCount, columnCount]);
      return {
        getValues: () =>
          rows
            .slice(row - 1, row - 1 + rowCount)
            .map(values => values.slice(column - 1, column - 1 + columnCount)),
      };
    },
  };

  const context = vm.createContext({
    console,
    Math,
    Date,
    JSON,
    Number,
    String,
    Array,
    Object,
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text: string) => ({
        text,
        setMimeType() {
          return this;
        },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key: string) => cache.get(key) ?? null,
        put: (key: string, value: string) => cache.set(key, value),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => properties.get(key) ?? null,
        setProperty: (key: string, value: string) => properties.set(key, value),
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_algorithm: string, value: string) => Array.from(Buffer.from(value)),
      base64EncodeWebSafe: (bytes: number[]) => Buffer.from(bytes).toString('base64url'),
      newBlob: (value: string) => ({ getBytes: () => Array.from(Buffer.from(value)) }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => sheet,
      }),
    },
  });

  vm.runInContext(fs.readFileSync('google-apps-script/Code.gs', 'utf8'), context);

  const request = (parameters: Record<string, string>) => {
    const output = vm.runInContext(`doGet(${JSON.stringify({ parameter: parameters })})`, context) as {
      text: string;
    };
    return JSON.parse(output.text);
  };

  return {
    request,
    rangeReads,
    get dataRangeReads() {
      return dataRangeReads;
    },
    clearCache: () => vm.runInContext(`clearSheetCache('ใบเคลม')`, context),
  };
}

const rows: SheetValue[][] = [
  ['id', 'ProvinceName', 'CustomerName', 'status', 'updatedAt'],
  ['CLAIM-1', 'กรุงเทพฯ', 'สมชาย', 'รอเคลม', new Date('2026-01-01T00:00:00Z')],
  ['CLAIM-2', 'โคราช', 'สมหญิง', 'จบเคลม', new Date('2026-01-02T00:00:00Z')],
  ['CLAIM-3', 'กรุงเทพฯ', 'มานะ', 'รอเคลม', new Date('2026-01-03T00:00:00Z')],
  ['CLAIM-4', 'อำนาจเจริญ', 'ปิติ', 'จบเคลม', new Date('2026-01-04T00:00:00Z')],
  ['CLAIM-5', 'กรุงเทพฯ', 'ชูใจ', 'รอเคลม', new Date('2026-01-05T00:00:00Z')],
];

describe('Google Apps Script doGet', () => {
  it('preserves the legacy array response', () => {
    const runtime = createRuntime(rows);
    const response = runtime.request({ sheetName: 'ใบเคลม' });

    expect(Array.isArray(response)).toBe(true);
    expect(response).toHaveLength(5);
    expect(runtime.dataRangeReads).toBe(1);
    expect(runtime.rangeReads).toEqual([]);
  });

  it('does not cache the legacy full claim response', () => {
    const mutableRows = rows.map(row => [...row]);
    const runtime = createRuntime(mutableRows);

    expect(runtime.request({ sheetName: 'ใบเคลม' })[0].CustomerName).toBe('สมชาย');
    mutableRows[1][2] = 'อ่านค่าล่าสุด';
    expect(runtime.request({ sheetName: 'ใบเคลม' })[0].CustomerName).toBe('อ่านค่าล่าสุด');
  });

  it('reads only the requested page when no filters are present', () => {
    const runtime = createRuntime(rows);
    const response = runtime.request({ sheetName: 'ใบเคลม', page: '2', limit: '2' });

    expect(response).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(response.items.map((item: { id: string }) => item.id)).toEqual(['CLAIM-3', 'CLAIM-4']);
    expect(runtime.rangeReads).toContainEqual([4, 1, 2, 5]);
    expect(runtime.rangeReads).not.toContainEqual([2, 1, 5, 5]);
  });

  it('applies status, province, customer and global search filters before pagination', () => {
    const runtime = createRuntime(rows);
    const response = runtime.request({
      sheetName: 'ใบเคลม',
      page: '1',
      limit: '20',
      status: 'รอเคลม',
      provinceName: 'กรุงเทพ',
      customerName: 'ชู',
      search: 'claim-5',
    });

    expect(response.total).toBe(1);
    expect(response.items[0].id).toBe('CLAIM-5');
  });

  it('applies claim priority globally before slicing the requested page', () => {
    const priorityRows: SheetValue[][] = [
      [
        'id',
        'ProvinceName',
        'CustomerName',
        'status',
        'inspectstatus',
        'claimDate',
        'inspectionDate',
        'receiverClaimDate',
      ],
      ['CLAIM-1', 'กรุงเทพฯ', 'A', 'จบเคลม', '-', '2026-08-01', '-', '-'],
      ['CLAIM-2', 'กรุงเทพฯ', 'B', 'รอเคลม', 'รอตรวจสอบ', '2026-07-01', '-', '-'],
      ['CLAIM-3', 'โคราช', 'C', 'ไปเคลมเอง', '-', '2026-06-01', '-', '-'],
      ['CLAIM-4', 'กรุงเทพฯ', 'D', 'รอเคลม', 'จบการตรวจสอบ', '2026-09-01', '-', '-'],
    ];
    const runtime = createRuntime(priorityRows);

    const firstPage = runtime.request({
      sheetName: 'ใบเคลม',
      page: '1',
      limit: '2',
      sort: 'claimPriority',
    });
    const secondPage = runtime.request({
      sheetName: 'ใบเคลม',
      page: '2',
      limit: '2',
      sort: 'claimPriority',
    });

    expect(firstPage.sortApplied).toBe('claimPriority');
    expect(firstPage.items.map((item: { id: string }) => item.id)).toEqual([
      'CLAIM-3',
      'CLAIM-2',
    ]);
    expect(secondPage.items.map((item: { id: string }) => item.id)).toEqual([
      'CLAIM-4',
      'CLAIM-1',
    ]);
    expect(firstPage.facets.provinces).toEqual(['กรุงเทพฯ', 'โคราช']);
  });

  it('applies inspectstatus before pagination', () => {
    const priorityRows: SheetValue[][] = [
      ['id', 'ProvinceName', 'CustomerName', 'status', 'inspectstatus'],
      ['CLAIM-1', 'กรุงเทพฯ', 'A', 'รอเคลม', 'รอตรวจสอบ'],
      ['CLAIM-2', 'กรุงเทพฯ', 'B', 'รอเคลม', 'จบการตรวจสอบ'],
      ['CLAIM-3', 'โคราช', 'C', 'จบเคลม', 'รอตรวจสอบ'],
    ];
    const runtime = createRuntime(priorityRows);

    const response = runtime.request({
      sheetName: 'ใบเคลม',
      page: '1',
      limit: '1',
      inspectstatus: 'รอตรวจสอบ',
    });

    expect(response.total).toBe(2);
    expect(response.totalPages).toBe(2);
    expect(response.items[0].inspectstatus).toBe('รอตรวจสอบ');
  });

  it('invalidates all query variants after the sheet cache version changes', () => {
    const mutableRows = rows.map(row => [...row]);
    const runtime = createRuntime(mutableRows);
    const parameters = { sheetName: 'ใบเคลม', page: '1', limit: '2' };

    expect(runtime.request(parameters).items[0].CustomerName).toBe('สมชาย');
    mutableRows[1][2] = 'เปลี่ยนแล้ว';
    expect(runtime.request(parameters).items[0].CustomerName).toBe('สมชาย');

    runtime.clearCache();
    expect(runtime.request(parameters).items[0].CustomerName).toBe('เปลี่ยนแล้ว');
  });
});
