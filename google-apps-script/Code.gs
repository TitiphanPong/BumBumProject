const CLAIM_SHEET_NAME = 'ใบเคลม';
const SPARE_PART_SHEET_NAME = 'เบิกอะไหล่';
const READ_CACHE_SECONDS = 600;
const MAX_CACHE_BYTES = 90000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;
const BANGKOK_TIMEZONE = 'Asia/Bangkok';

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function jsonTextResponse(json) {
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function digestCacheKey(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(digest);
}

function getSheetCacheVersion(sheetName) {
  return PropertiesService.getScriptProperties().getProperty(`sheet-version:${sheetName}`) || '1';
}

function getSheetCacheKey(sheetName, query) {
  const version = getSheetCacheVersion(sheetName);
  return `sheet:${digestCacheKey(JSON.stringify({ version, sheetName, query }))}`;
}

function getCachedJson(cacheKey) {
  try {
    return CacheService.getScriptCache().get(cacheKey);
  } catch (error) {
    console.warn(`Cache read skipped: ${error.message}`);
    return null;
  }
}

function cacheJson(cacheKey, json) {
  try {
    if (Utilities.newBlob(json).getBytes().length <= MAX_CACHE_BYTES) {
      CacheService.getScriptCache().put(cacheKey, json, READ_CACHE_SECONDS);
    }
  } catch (error) {
    // Cache must never make a working API request fail.
    console.warn(`Cache write skipped: ${error.message}`);
  }
}

function clearSheetCache(sheetName) {
  PropertiesService.getScriptProperties().setProperty(
    `sheet-version:${sheetName}`,
    `${Date.now()}-${Math.random()}`
  );
}

function getHeaderRow(sheet, knownLastColumn) {
  const lastColumn = knownLastColumn || sheet.getLastColumn();
  if (lastColumn < 1) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function normalizeDateFilter(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeQuery(parameters) {
  const params = parameters || {};
  const sort = String(params.sort || '').trim();
  const direction = String(params.direction || '').trim().toLowerCase();

  return {
    page: positiveInteger(params.page, 1, Number.MAX_SAFE_INTEGER),
    limit: positiveInteger(params.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    id: String(params.id || '').trim(),
    aggregate: ['dashboard', 'claimPerson'].includes(String(params.aggregate || '').trim())
      ? String(params.aggregate || '').trim()
      : '',
    dateFrom: normalizeDateFilter(params.dateFrom),
    dateTo: normalizeDateFilter(params.dateTo),
    claimerName: String(params.claimerName || '').trim().toLocaleLowerCase('th-TH'),
    search: String(params.search || '').trim().toLocaleLowerCase('th-TH'),
    status: String(params.status || '').trim().toLocaleLowerCase('th-TH'),
    inspectstatus: String(params.inspectstatus || '').trim().toLocaleLowerCase('th-TH'),
    provinceName: String(params.provinceName || '').trim().toLocaleLowerCase('th-TH'),
    customerName: String(params.customerName || '').trim().toLocaleLowerCase('th-TH'),
    sort: sort === 'claimPriority' ? sort : '',
    direction: direction === 'desc' ? 'desc' : 'asc',
  };
}

function hasStructuredReadParameters(parameters) {
  const params = parameters || {};
  return [
    'page',
    'limit',
    'id',
    'aggregate',
    'dateFrom',
    'dateTo',
    'claimerName',
    'search',
    'status',
    'inspectstatus',
    'provinceName',
    'customerName',
    'sort',
    'direction',
  ].some(name => params[name] !== undefined && params[name] !== '');
}

function rowToRecord(headers, row) {
  const record = {};
  headers.forEach((header, index) => {
    record[header] = row[index];
  });
  return record;
}

function findHeaderIndex(headers, candidates) {
  const normalizedHeaders = headers.map(header => String(header).trim().toLocaleLowerCase('th-TH'));
  for (const candidate of candidates) {
    const index = normalizedHeaders.indexOf(candidate.toLocaleLowerCase('th-TH'));
    if (index !== -1) return index;
  }
  return -1;
}

const CLAIMER_HEADER_CANDIDATES = [
  'claimSender',
  'claimerName',
  'คนไปเคลม',
  'ผู้เคลม',
  'assignedTo',
  'assignee',
  'technician',
  'employeeName',
  'handlerName',
  'staff',
];
const VEHICLE_HEADER_CANDIDATES = ['vehicleClaim', 'vehicle', 'vehicleType'];
const SERVICE_FEE_HEADER_CANDIDATES = [
  'serviceFeeStatus',
  'serviceChargeStatus',
  'สถานะค่าบริการ',
];

function firstNonEmptyRowValue(headers, row, candidates) {
  for (const candidate of candidates) {
    const index = findHeaderIndex(headers, [candidate]);
    if (index === -1) continue;
    const value = String(row[index] === null || row[index] === undefined ? '' : row[index]).trim();
    if (value) return value;
  }
  return '';
}

function firstDefinedRowValue(headers, row, candidates) {
  for (const candidate of candidates) {
    const index = findHeaderIndex(headers, [candidate]);
    if (index === -1) continue;
    const value = row[index];
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

function getClaimerNameFromRow(headers, row) {
  return firstNonEmptyRowValue(headers, row, CLAIMER_HEADER_CANDIDATES) || '(ไม่ระบุผู้เคลม)';
}

function isMotorcycleValue(value) {
  return /มอ|มอเตอร์|motor/i.test(String(value || '').trim());
}

function isNotDeductedStrictValue(value) {
  if (typeof value === 'boolean') return value === false;
  const text = String(value === null || value === undefined ? '' : value).trim();
  return Boolean(text) && text.includes('ยังไม่หัก');
}

function isCountableClaimRow(headers, row) {
  const vehicle = firstNonEmptyRowValue(headers, row, VEHICLE_HEADER_CANDIDATES);
  const statusIndex = findHeaderIndex(headers, ['status']);
  const status = statusIndex === -1 ? '' : String(row[statusIndex] || '').trim();
  const serviceFeeFlag = firstDefinedRowValue(headers, row, SERVICE_FEE_HEADER_CANDIDATES);
  return isMotorcycleValue(vehicle) && status === 'จบเคลม' && isNotDeductedStrictValue(serviceFeeFlag);
}

function createRowMatcher(headers, query) {
  const statusIndex = findHeaderIndex(headers, ['status']);
  const inspectStatusIndex = findHeaderIndex(headers, ['inspectstatus']);
  const provinceIndex = findHeaderIndex(headers, ['ProvinceName', 'provinceName', 'สาขา']);
  const customerIndex = findHeaderIndex(headers, ['CustomerName', 'customerName']);
  const receiverClaimDateIndex = findHeaderIndex(headers, ['receiverClaimDate']);

  return row => {
    const normalized = row.map(value => String(value === null || value === undefined ? '' : value)
      .trim()
      .toLocaleLowerCase('th-TH'));

    if (query.status && (statusIndex === -1 || normalized[statusIndex] !== query.status)) return false;
    if (
      query.inspectstatus &&
      (inspectStatusIndex === -1 || normalized[inspectStatusIndex] !== query.inspectstatus)
    ) return false;
    if (query.provinceName) {
      if (provinceIndex === -1) return false;
      const province = normalized[provinceIndex] || 'อื่นๆ';
      if (!province.includes(query.provinceName)) return false;
    }
    if (
      query.customerName &&
      (customerIndex === -1 || !normalized[customerIndex].includes(query.customerName))
    ) return false;
    if (
      query.claimerName &&
      getClaimerNameFromRow(headers, row).toLocaleLowerCase('th-TH') !== query.claimerName
    ) return false;
    if (query.dateFrom || query.dateTo) {
      if (receiverClaimDateIndex === -1) return false;
      const claimDate = dateKey(row[receiverClaimDateIndex]);
      if (!claimDate) return false;
      if (query.dateFrom && claimDate < query.dateFrom) return false;
      if (query.dateTo && claimDate > query.dateTo) return false;
    }
    if (query.search && !normalized.some(value => value.includes(query.search))) return false;

    return true;
  };
}

function claimPriority(status, inspectStatus) {
  if (status === 'ไปเคลมเอง') return 0;
  if (status === 'รอเคลม' && inspectStatus === 'รอตรวจสอบ') return 1;
  if (status === 'รอเคลม') return 2;
  if (status === 'ยกเลิกเคลม') return 3;
  if (status === 'จบเคลม') return 4;
  return 5;
}

function dateValue(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === '[object Date]') return value.getTime();
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function dateKey(value) {
  if (!value) return '';

  const text = String(value).trim();
  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const parsed = Object.prototype.toString.call(value) === '[object Date]' ? value : new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return Utilities.formatDate(parsed, BANGKOK_TIMEZONE, 'yyyy-MM-dd');
}

function createDashboardAggregate(headers, rows, query) {
  const provinceIndex = findHeaderIndex(headers, ['ProvinceName', 'provinceName', 'สาขา']);
  const statusIndex = findHeaderIndex(headers, ['status']);
  const receiverClaimDateIndex = findHeaderIndex(headers, ['receiverClaimDate']);
  const provinces = Array.from(
    new Set(
      rows.map(row =>
        provinceIndex === -1 ? 'อื่นๆ' : String(row[provinceIndex] || '').trim() || 'อื่นๆ'
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'th'));
  const stats = { total: 0, completed: 0, pending: 0, selfClaim: 0 };
  const dateMap = {};

  for (const row of rows) {
    const province = provinceIndex === -1 ? 'อื่นๆ' : String(row[provinceIndex] || 'อื่นๆ').trim() || 'อื่นๆ';
    const normalizedProvince = province.toLocaleLowerCase('th-TH');
    if (query.provinceName && normalizedProvince !== query.provinceName) continue;

    const claimDate = receiverClaimDateIndex === -1 ? '' : dateKey(row[receiverClaimDateIndex]);
    const hasDateFilter = Boolean(query.dateFrom || query.dateTo);
    const isInDateRange =
      !hasDateFilter ||
      Boolean(
        claimDate &&
          (!query.dateFrom || claimDate >= query.dateFrom) &&
          (!query.dateTo || claimDate <= query.dateTo)
      );

    if (isInDateRange) {
      stats.total += 1;
      const status = statusIndex === -1 ? '' : String(row[statusIndex] || '').trim();
      if (status === 'จบเคลม') stats.completed += 1;
      if (status === 'รอเคลม') stats.pending += 1;
      if (status === 'ไปเคลมเอง') stats.selfClaim += 1;
    }

    if (!claimDate || !isInDateRange) continue;
    const provinceMap = dateMap[claimDate] || (dateMap[claimDate] = {});
    provinceMap[province] = (provinceMap[province] || 0) + 1;
  }

  const chartData = Object.keys(dateMap)
    .sort()
    .map(date => Object.assign({ date }, dateMap[date]));

  return {
    aggregateApplied: 'dashboard',
    stats,
    chartData,
    provinces,
  };
}

function createClaimPersonAggregate(headers, rows, query) {
  const provinceIndex = findHeaderIndex(headers, ['ProvinceName', 'provinceName', 'สาขา']);
  const receiverClaimDateIndex = findHeaderIndex(headers, ['receiverClaimDate']);
  const provinces = Array.from(
    new Set(
      rows.map(row =>
        provinceIndex === -1 ? 'อื่นๆ' : String(row[provinceIndex] || '').trim() || 'อื่นๆ'
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'th'));
  const countsByPerson = {};
  let totalCasesAll = 0;
  let totalEligible = 0;

  for (const row of rows) {
    const province = provinceIndex === -1 ? 'อื่นๆ' : String(row[provinceIndex] || '').trim() || 'อื่นๆ';
    if (query.provinceName && province.toLocaleLowerCase('th-TH') !== query.provinceName) continue;

    const claimDate = receiverClaimDateIndex === -1 ? '' : dateKey(row[receiverClaimDateIndex]);
    const hasDateFilter = Boolean(query.dateFrom || query.dateTo);
    if (
      hasDateFilter &&
      (!claimDate ||
        (query.dateFrom && claimDate < query.dateFrom) ||
        (query.dateTo && claimDate > query.dateTo))
    ) continue;

    totalCasesAll += 1;
    if (!isCountableClaimRow(headers, row)) continue;

    totalEligible += 1;
    const person = getClaimerNameFromRow(headers, row);
    countsByPerson[person] = (countsByPerson[person] || 0) + 1;
  }

  const personRows = Object.keys(countsByPerson).map(person => ({
    key: person,
    person,
    cases: countsByPerson[person],
    amount: countsByPerson[person] * 30,
  }));

  return {
    aggregateApplied: 'claimPerson',
    metrics: {
      totalCasesAll,
      totalEligible,
      totalAmount: totalEligible * 30,
    },
    personRows,
    provinces,
  };
}

function createClaimPriorityComparator(headers) {
  const statusIndex = findHeaderIndex(headers, ['status']);
  const inspectStatusIndex = findHeaderIndex(headers, ['inspectstatus']);
  const claimDateIndex = findHeaderIndex(headers, ['claimDate']);
  const inspectionDateIndex = findHeaderIndex(headers, ['inspectionDate']);
  const receiverClaimDateIndex = findHeaderIndex(headers, ['receiverClaimDate']);
  const idIndex = findHeaderIndex(headers, ['id']);

  return (a, b) => {
    const statusA = statusIndex === -1 ? '' : String(a[statusIndex] || '').trim();
    const statusB = statusIndex === -1 ? '' : String(b[statusIndex] || '').trim();
    const inspectA = inspectStatusIndex === -1 ? '' : String(a[inspectStatusIndex] || '').trim();
    const inspectB = inspectStatusIndex === -1 ? '' : String(b[inspectStatusIndex] || '').trim();
    const priorityA = claimPriority(statusA, inspectA);
    const priorityB = claimPriority(statusB, inspectB);
    if (priorityA !== priorityB) return priorityA - priorityB;

    const timeA =
      (claimDateIndex === -1 ? 0 : dateValue(a[claimDateIndex])) ||
      (inspectionDateIndex === -1 ? 0 : dateValue(a[inspectionDateIndex])) ||
      (receiverClaimDateIndex === -1 ? 0 : dateValue(a[receiverClaimDateIndex]));
    const timeB =
      (claimDateIndex === -1 ? 0 : dateValue(b[claimDateIndex])) ||
      (inspectionDateIndex === -1 ? 0 : dateValue(b[inspectionDateIndex])) ||
      (receiverClaimDateIndex === -1 ? 0 : dateValue(b[receiverClaimDateIndex]));
    if (timeA !== timeB) return timeB - timeA;

    const idA = idIndex === -1 ? '' : String(a[idIndex] || '');
    const idB = idIndex === -1 ? '' : String(b[idIndex] || '');
    return idB.localeCompare(idA);
  };
}

function collectProvinceFacets(headers, rows) {
  const provinceIndex = findHeaderIndex(headers, ['ProvinceName', 'provinceName', 'สาขา']);
  if (provinceIndex === -1) return [];

  return Array.from(
    new Set(rows.map(row => String(row[provinceIndex] || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'th'));
}

function findDataRowById(sheet, id, knownHeaders) {
  const headers = knownHeaders || getHeaderRow(sheet);
  const idColumn = headers.indexOf('id');
  if (idColumn === -1) throw new Error("No 'id' column found");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const match = sheet
    .getRange(2, idColumn + 1, lastRow - 1, 1)
    .createTextFinder(String(id).trim())
    .matchEntireCell(true)
    .matchCase(true)
    .findNext();

  return match ? match.getRow() : -1;
}

function normalizeBuyProductDate(value, emptyValue) {
  if (value === undefined || value === null || value === '' || value === '-') {
    return emptyValue;
  }

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    if (year < 1900 || year >= 2400) {
      throw new Error('buyProductDate must use a Gregorian year, for example 2026');
    }
    return text;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid buyProductDate');

  const year = Number(
    Utilities.formatDate(parsed, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy')
  );
  if (year < 1900 || year >= 2400) {
    throw new Error('buyProductDate must use a Gregorian year, for example 2026');
  }

  return Utilities.formatDate(
    parsed,
    Session.getScriptTimeZone() || 'Asia/Bangkok',
    'yyyy-MM-dd'
  );
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'add';

    if (action === 'update') return doPut(e);
    if (action === 'delete') return doDelete(e);

    const sheetName = data.sheetName || CLAIM_SHEET_NAME;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet '${sheetName}' not found`);

    const headers = getHeaderRow(sheet);
    if (headers[0] !== 'id') {
      sheet.insertColumnBefore(1);
      sheet.getRange(1, 1).setValue('id');
    }

    const rowCount = sheet.getLastRow();
    const idPrefix = sheetName === CLAIM_SHEET_NAME ? 'CLAIM' : 'SPAREPART';
    const newId = `${idPrefix}-${String(rowCount).padStart(4, '0')}`;

    let row = [];
    let savedBuyProductDate = '';

    if (sheetName === CLAIM_SHEET_NAME) {
      savedBuyProductDate = normalizeBuyProductDate(data.buyProductDate, '');
      row = [
        newId,
        data.provinceName || '',
        data.customerName || '',
        data.phone || '',
        data.address || '',
        data.product || '',
        savedBuyProductDate,
        data.problem || '',
        (data.warranty || []).join(', '),
        data.receiver || '',
        data.receiverClaimDate || '',
        data.inspector || '',
        (data.vehicleInspector || []).join(', '),
        data.inspectionDate || '',
        data.inspectstatus || '',
        data.claimSender || '',
        (data.vehicleClaim || []).join(', '),
        data.claimDate || '',
        data.status || '',
        (data.serviceChargeStatus || []).join(', '),
        data.note || '',
        new Date(),
      ];
    } else if (sheetName === SPARE_PART_SHEET_NAME) {
      row = [
        newId,
        data.provinceName || '',
        data.customerName || '',
        Array.isArray(data.warranty) ? data.warranty.join(', ') : '',
        data.product || '',
        data.problem || '',
        data.part || '',
        data.requestDate || '',
        data.requester || '',
        data.payer || '',
        data.receiver || '',
        data.receiverItemDate || '',
        data.note || '',
        new Date(),
      ];
    } else {
      throw new Error(`Unsupported sheet '${sheetName}'`);
    }

    sheet.appendRow(row);
    clearSheetCache(sheetName);

    return jsonResponse({
      result: 'success',
      id: newId,
      buyProductDate: savedBuyProductDate,
      message: 'เพิ่มข้อมูลสำเร็จ',
    });
  } catch (error) {
    return jsonResponse({ result: 'error', message: error.message });
  }
}

function doGet(e) {
  try {
    const parameters = e && e.parameter ? e.parameter : {};
    const sheetName = parameters.sheetName
      ? parameters.sheetName
      : CLAIM_SHEET_NAME;
    const structuredRead = hasStructuredReadParameters(parameters);
    const query = normalizeQuery(parameters);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error(`ไม่พบชีต '${sheetName}'`);

    // Preserve the original fast path for all existing frontend callers.
    // It performs one batch spreadsheet read and skips pagination/cache overhead.
    if (!structuredRead) {
      const data = sheet.getDataRange().getValues();
      if (data.length === 0) return jsonResponse([]);

      const headers = data[0];
      const result = data.slice(1).map(row => rowToRecord(headers, row));
      return jsonResponse(result);
    }

    // Exact-ID reads are used for post-save verification. Use TextFinder on the ID column
    // so one verification does not require loading the entire sheet into Apps Script memory.
    if (query.id) {
      const cacheKey = getSheetCacheKey(sheetName, query);
      const cached = getCachedJson(cacheKey);
      if (cached !== null) return jsonTextResponse(cached);

      const lastColumn = sheet.getLastColumn();
      const headers = getHeaderRow(sheet, lastColumn);
      const rowNumber = findDataRowById(sheet, query.id, headers);
      const matchingRows =
        rowNumber !== -1 && lastColumn > 0
          ? sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()
          : [];
      const response = {
        items: matchingRows.map(row => rowToRecord(headers, row)),
        page: 1,
        limit: 1,
        total: matchingRows.length,
        totalPages: matchingRows.length,
        sortApplied: null,
        directionApplied: query.direction,
        idApplied: query.id,
        facets: { provinces: collectProvinceFacets(headers, matchingRows) },
      };
      const json = JSON.stringify(response);
      cacheJson(cacheKey, json);
      return jsonTextResponse(json);
    }

    if (query.aggregate) {
      if (sheetName !== CLAIM_SHEET_NAME) throw new Error('Claim aggregates are only available for claims');

      const cacheKey = getSheetCacheKey(sheetName, query);
      const cached = getCachedJson(cacheKey);
      if (cached !== null) return jsonTextResponse(cached);

      const data = sheet.getDataRange().getValues();
      const headers = data[0] || [];
      const rows = data.slice(1);
      const response =
        query.aggregate === 'claimPerson'
          ? createClaimPersonAggregate(headers, rows, query)
          : createDashboardAggregate(headers, rows, query);
      const json = JSON.stringify(response);
      cacheJson(cacheKey, json);
      return jsonTextResponse(json);
    }

    const cacheKey = getSheetCacheKey(sheetName, query);
    const cached = getCachedJson(cacheKey);
    if (cached !== null) return jsonTextResponse(cached);

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const totalRows = Math.max(lastRow - 1, 0);
    const headers = getHeaderRow(sheet, lastColumn);

    if (lastRow < 2 || lastColumn < 1) {
      const emptyJson = structuredRead
        ? JSON.stringify({
            items: [],
            page: query.page,
            limit: query.limit,
            total: 0,
            totalPages: 0,
            sortApplied: query.sort || null,
            directionApplied: query.direction,
            facets: { provinces: [] },
          })
        : '[]';
      if (cacheKey) cacheJson(cacheKey, emptyJson);
      return jsonTextResponse(emptyJson);
    }

    const hasFilters = Boolean(
      query.search ||
      query.status ||
      query.inspectstatus ||
      query.provinceName ||
      query.customerName ||
      query.claimerName ||
      query.dateFrom ||
      query.dateTo
    );
    const offset = (query.page - 1) * query.limit;
    const requiresGlobalRead = hasFilters || query.sort === 'claimPriority' || query.direction === 'desc';
    let matchingRows;
    let total;
    let provinceFacets = [];

    if (requiresGlobalRead) {
      // Filtering and global ordering require one batch read. Only the requested page is
      // serialized back to the browser, and identical requests are served from CacheService.
      const allRows = sheet.getRange(2, 1, totalRows, lastColumn).getValues();
      matchingRows = hasFilters ? allRows.filter(createRowMatcher(headers, query)) : allRows.slice();
      provinceFacets = collectProvinceFacets(headers, allRows);

      if (query.sort === 'claimPriority') {
        matchingRows.sort(createClaimPriorityComparator(headers));
      } else if (query.direction === 'desc') {
        matchingRows.reverse();
      }

      total = matchingRows.length;
      matchingRows = matchingRows.slice(offset, offset + query.limit);
    } else {
      // Preserve the original efficient structured-read path when no global work is needed.
      total = totalRows;
      const rowsToRead = Math.max(Math.min(query.limit, totalRows - offset), 0);
      matchingRows = rowsToRead > 0
        ? sheet.getRange(offset + 2, 1, rowsToRead, lastColumn).getValues()
        : [];
    }

    const response = {
      items: matchingRows.map(row => rowToRecord(headers, row)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      sortApplied: query.sort || null,
      directionApplied: query.direction,
      facets: { provinces: provinceFacets },
    };
    const json = JSON.stringify(response);
    if (cacheKey) cacheJson(cacheKey, json);
    return jsonTextResponse(json);
  } catch (error) {
    return jsonResponse({ result: 'error', message: error.message });
  }
}

function doDelete(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      data.sheetName || CLAIM_SHEET_NAME
    );
    if (!sheet) throw new Error('ไม่พบชีต');

    const rowNumber = findDataRowById(sheet, data.id);
    if (rowNumber === -1) throw new Error('ไม่พบแถวที่ตรงกับ ID ที่ระบุ');

    sheet.deleteRow(rowNumber);
    clearSheetCache(data.sheetName || CLAIM_SHEET_NAME);
    return jsonResponse({ result: 'success', deletedRow: rowNumber - 1 });
  } catch (error) {
    return jsonResponse({ result: 'error', message: error.message });
  }
}

function doPut(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sheetName || CLAIM_SHEET_NAME;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet '${sheetName}' not found`);

    const rowNumber = findDataRowById(sheet, data.id);
    if (rowNumber === -1) throw new Error('ไม่พบข้อมูล ID นี้');

    let updatedRow = [];
    let savedBuyProductDate = '';

    if (sheetName === CLAIM_SHEET_NAME) {
      savedBuyProductDate = normalizeBuyProductDate(data.buyProductDate, '-');
      updatedRow = [
        data.id,
        data.provinceName || '',
        data.customerName || '',
        data.phone || '',
        data.address || '',
        data.product || '',
        savedBuyProductDate,
        data.problem || '',
        (data.warranty || []).join(', '),
        data.receiver || '',
        data.receiverClaimDate || '',
        data.inspector || '',
        (data.vehicleInspector || []).join(', '),
        data.inspectionDate || '',
        data.inspectstatus || '',
        data.claimSender || '',
        (data.vehicleClaim || []).join(', '),
        data.claimDate || '',
        data.status || '',
        (data.serviceChargeStatus || []).join(', '),
        data.note || '',
        new Date(),
      ];
    } else if (sheetName === SPARE_PART_SHEET_NAME) {
      updatedRow = [
        data.id,
        data.provinceName || '',
        data.customerName || '',
        Array.isArray(data.warranty) ? data.warranty.join(', ') : '',
        data.product || '',
        data.problem || '',
        data.part || '',
        data.requestDate || '',
        data.requester || '',
        data.payer || '',
        data.receiver || '',
        data.receiverItemDate || '',
        data.note || '',
        new Date(),
      ];
    } else {
      throw new Error(`Unsupported sheet '${sheetName}'`);
    }

    sheet.getRange(rowNumber, 1, 1, updatedRow.length).setValues([updatedRow]);
    clearSheetCache(sheetName);
    return jsonResponse({
      result: 'success',
      id: data.id,
      product: data.product || '',
      buyProductDate: savedBuyProductDate,
      message: 'อัปเดตข้อมูลเรียบร้อยแล้ว',
    });
  } catch (error) {
    return jsonResponse({ result: 'error', message: error.message });
  }
}

// Run manually once from the Apps Script editor. It creates a backup sheet first.
function backupAndMigrateBuyProductDates() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CLAIM_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet '${CLAIM_SHEET_NAME}' not found`);

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const backup = sheet.copyTo(spreadsheet).setName(`ใบเคลม-backup-${timestamp}`);
  if (!backup) throw new Error('Unable to create backup sheet');

  const values = sheet.getDataRange().getValues();
  const dateColumn = values[0].indexOf('buyProductDate');
  if (dateColumn === -1) throw new Error("No 'buyProductDate' column found");

  let migratedCount = 0;
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const value = values[rowIndex][dateColumn];
    if (value === '' || value === '-') continue;

    let year;
    let month;
    let day;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      year = value.getFullYear();
      month = value.getMonth() + 1;
      day = value.getDate();
    } else {
      const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) continue;
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    }

    if (year < 2400) continue;
    const converted = `${String(year - 543).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    sheet.getRange(rowIndex + 1, dateColumn + 1).setValue(converted);
    migratedCount += 1;
  }

  sheet.getRange(2, dateColumn + 1, Math.max(sheet.getLastRow() - 1, 1), 1).setNumberFormat(
    'yyyy-mm-dd'
  );
  Logger.log(`Created backup '${backup.getName()}' and migrated ${migratedCount} row(s).`);
}
