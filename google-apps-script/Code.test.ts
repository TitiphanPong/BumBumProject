import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type SheetValue = string | number | boolean | Date;

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
      const getValues = () =>
        rows
          .slice(row - 1, row - 1 + rowCount)
          .map(values => values.slice(column - 1, column - 1 + columnCount));

      return {
        getValues,
        createTextFinder: (searchText: string) => {
          let entireCell = false;
          let caseSensitive = false;
          const finder = {
            matchEntireCell(value: boolean) {
              entireCell = value;
              return finder;
            },
            matchCase(value: boolean) {
              caseSensitive = value;
              return finder;
            },
            findNext() {
              const needle = caseSensitive ? searchText : searchText.toLowerCase();
              const values = getValues();
              for (let rowOffset = 0; rowOffset < values.length; rowOffset += 1) {
                for (let columnOffset = 0; columnOffset < values[rowOffset].length; columnOffset += 1) {
                  const raw = String(values[rowOffset][columnOffset] ?? '');
                  const haystack = caseSensitive ? raw : raw.toLowerCase();
                  const matches = entireCell ? haystack === needle : haystack.includes(needle);
                  if (matches) {
                    return {
                      getRow: () => row + rowOffset,
                      getColumn: () => column + columnOffset,
                    };
                  }
                }
              }
              return null;
            },
          };
          return finder;
        },
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

  it('reads one exact ID without loading the full sheet data range', () => {
    const runtime = createRuntime(rows);
    const response = runtime.request({
      sheetName: 'ใบเคลม',
      id: 'CLAIM-4',
      page: '1',
      limit: '1',
    });

    expect(response).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1,
      idApplied: 'CLAIM-4',
    });
    expect(response.items.map((item: { id: string }) => item.id)).toEqual(['CLAIM-4']);
    expect(runtime.dataRangeReads).toBe(0);
    expect(runtime.rangeReads).toContainEqual([2, 1, 5, 1]);
    expect(runtime.rangeReads).toContainEqual([5, 1, 1, 5]);
    expect(runtime.rangeReads).not.toContainEqual([2, 1, 5, 5]);
  });

  it('returns compact dashboard aggregates with server-side province/date filtering', () => {
    const dashboardRows: SheetValue[][] = [
      ['id', 'ProvinceName', 'CustomerName', 'status', 'receiverClaimDate'],
      ['CLAIM-1', 'กรุงเทพฯ', 'สมชาย', 'จบเคลม', '2026-09-01'],
      ['CLAIM-2', 'โคราช', 'สมหญิง', 'รอเคลม', '2026-09-02'],
      ['CLAIM-3', 'กรุงเทพฯ', 'มานะ', 'ไปเคลมเอง', '2026-09-02'],
      ['CLAIM-4', '', 'ปิติ', 'จบเคลม', ''],
    ];
    const runtime = createRuntime(dashboardRows);

    const all = runtime.request({ sheetName: 'ใบเคลม', aggregate: 'dashboard' });
    expect(all).toMatchObject({
      aggregateApplied: 'dashboard',
      stats: { total: 4, completed: 2, pending: 1, selfClaim: 1 },
    });
    expect(all.provinces).toEqual(expect.arrayContaining(['กรุงเทพฯ', 'โคราช', 'อื่นๆ']));
    expect(all.chartData).toEqual([
      { date: '2026-09-01', 'กรุงเทพฯ': 1 },
      { date: '2026-09-02', 'กรุงเทพฯ': 1, 'โคราช': 1 },
    ]);

    const filtered = runtime.request({
      sheetName: 'ใบเคลม',
      aggregate: 'dashboard',
      provinceName: 'กรุงเทพฯ',
      dateFrom: '2026-09-02',
      dateTo: '2026-09-02',
    });
    expect(filtered).toMatchObject({
      aggregateApplied: 'dashboard',
      stats: { total: 1, completed: 0, pending: 0, selfClaim: 1 },
      chartData: [{ date: '2026-09-02', 'กรุงเทพฯ': 1 }],
    });
  });

  it('returns compact claim-person aggregates using the existing fee rules and aliases', () => {
    const claimPersonRows: SheetValue[][] = [
      [
        'id',
        'ProvinceName',
        'CustomerName',
        'status',
        'receiverClaimDate',
        'claimSender',
        'vehicleClaim',
        'serviceChargeStatus',
      ],
      ['CLAIM-1', 'กรุงเทพฯ', 'A', 'จบเคลม', '2026-09-01', 'นรินทร์', 'มอเตอร์ไซค์', 'ยังไม่หัก'],
      ['CLAIM-2', 'กรุงเทพฯ', 'B', 'จบเคลม', '2026-09-02', 'นรินทร์', 'รถยนต์', 'ยังไม่หัก'],
      ['CLAIM-3', 'กรุงเทพฯ', 'C', 'จบเคลม', '2026-09-02', '', 'Motorcycle', false],
      ['CLAIM-4', 'โคราช', 'D', 'จบเคลม', '2026-09-03', 'มานะ', 'มอเตอร์ไซค์', 'หักแล้ว'],
      ['CLAIM-5', 'กรุงเทพฯ', 'E', 'รอเคลม', '2026-09-03', 'ปิติ', 'มอเตอร์ไซค์', 'ยังไม่หัก'],
    ];
    const runtime = createRuntime(claimPersonRows);

    const all = runtime.request({ sheetName: 'ใบเคลม', aggregate: 'claimPerson' });
    expect(all).toMatchObject({
      aggregateApplied: 'claimPerson',
      metrics: { totalCasesAll: 5, totalEligible: 2, totalAmount: 60 },
    });
    expect(all.personRows).toEqual(
      expect.arrayContaining([
        { key: 'นรินทร์', person: 'นรินทร์', cases: 1, amount: 30 },
        { key: '(ไม่ระบุผู้เคลม)', person: '(ไม่ระบุผู้เคลม)', cases: 1, amount: 30 },
      ])
    );
    expect(all.provinces).toEqual(expect.arrayContaining(['กรุงเทพฯ', 'โคราช']));

    const filtered = runtime.request({
      sheetName: 'ใบเคลม',
      aggregate: 'claimPerson',
      provinceName: 'กรุงเทพฯ',
      dateFrom: '2026-09-02',
      dateTo: '2026-09-02',
    });
    expect(filtered).toMatchObject({
      metrics: { totalCasesAll: 2, totalEligible: 1, totalAmount: 30 },
      personRows: [
        { key: '(ไม่ระบุผู้เคลม)', person: '(ไม่ระบุผู้เคลม)', cases: 1, amount: 30 },
      ],
    });
  });

  it('filters paginated modal rows by claimer aliases without restricting to countable cases', () => {
    const claimPersonRows: SheetValue[][] = [
      ['id', 'ProvinceName', 'CustomerName', 'status', 'receiverClaimDate', 'claimerName', 'vehicleClaim', 'serviceChargeStatus'],
      ['CLAIM-1', 'กรุงเทพฯ', 'A', 'จบเคลม', '2026-09-01', 'นรินทร์', 'มอเตอร์ไซค์', 'ยังไม่หัก'],
      ['CLAIM-2', 'กรุงเทพฯ', 'B', 'จบเคลม', '2026-09-02', 'นรินทร์', 'รถยนต์', 'ยังไม่หัก'],
      ['CLAIM-3', 'กรุงเทพฯ', 'C', 'จบเคลม', '2026-09-02', '', 'มอเตอร์ไซค์', 'ยังไม่หัก'],
    ];
    const runtime = createRuntime(claimPersonRows);

    const named = runtime.request({
      sheetName: 'ใบเคลม',
      page: '1',
      limit: '10',
      claimerName: 'นรินทร์',
      provinceName: 'กรุงเทพฯ',
    });
    expect(named.total).toBe(2);
    expect(named.items.map((item: { id: string }) => item.id)).toEqual(['CLAIM-1', 'CLAIM-2']);

    const unspecified = runtime.request({
      sheetName: 'ใบเคลม',
      page: '1',
      limit: '10',
      claimerName: '(ไม่ระบุผู้เคลม)',
    });
    expect(unspecified.items.map((item: { id: string }) => item.id)).toEqual(['CLAIM-3']);
  });

  it('applies receiver date filters to paginated detail reads', () => {
    const dashboardRows: SheetValue[][] = [
      ['id', 'ProvinceName', 'CustomerName', 'status', 'receiverClaimDate'],
      ['CLAIM-1', 'กรุงเทพฯ', 'สมชาย', 'จบเคลม', '2026-09-01'],
      ['CLAIM-2', 'กรุงเทพฯ', 'สมหญิง', 'จบเคลม', '2026-09-02'],
      ['CLAIM-3', 'กรุงเทพฯ', 'มานะ', 'จบเคลม', '2026-09-03'],
    ];
    const runtime = createRuntime(dashboardRows);
    const response = runtime.request({
      sheetName: 'ใบเคลม',
      page: '1',
      limit: '10',
      status: 'จบเคลม',
      dateFrom: '2026-09-02',
      dateTo: '2026-09-02',
    });

    expect(response.items.map((item: { id: string }) => item.id)).toEqual(['CLAIM-2']);
    expect(response.total).toBe(1);
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
