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

function normalizeQuery(parameters) {
  const params = parameters || {};
  return {
    page: positiveInteger(params.page, 1, Number.MAX_SAFE_INTEGER),
    limit: positiveInteger(params.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    search: String(params.search || '').trim().toLocaleLowerCase('th-TH'),
    status: String(params.status || '').trim().toLocaleLowerCase('th-TH'),
    provinceName: String(params.provinceName || '').trim().toLocaleLowerCase('th-TH'),
    customerName: String(params.customerName || '').trim().toLocaleLowerCase('th-TH'),
  };
}

function hasStructuredReadParameters(parameters) {
  const params = parameters || {};
  return ['page', 'limit', 'search', 'status', 'provinceName', 'customerName'].some(
    name => params[name] !== undefined && params[name] !== ''
  );
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

function createRowMatcher(headers, query) {
  const statusIndex = findHeaderIndex(headers, ['status']);
  const provinceIndex = findHeaderIndex(headers, ['ProvinceName', 'provinceName']);
  const customerIndex = findHeaderIndex(headers, ['CustomerName', 'customerName']);

  return row => {
    const normalized = row.map(value => String(value === null || value === undefined ? '' : value)
      .trim()
      .toLocaleLowerCase('th-TH'));

    if (query.status && (statusIndex === -1 || normalized[statusIndex] !== query.status)) return false;
    if (
      query.provinceName &&
      (provinceIndex === -1 || !normalized[provinceIndex].includes(query.provinceName))
    ) return false;
    if (
      query.customerName &&
      (customerIndex === -1 || !normalized[customerIndex].includes(query.customerName))
    ) return false;
    if (query.search && !normalized.some(value => value.includes(query.search))) return false;

    return true;
  };
}

function findDataRowById(sheet, id) {
  const headers = getHeaderRow(sheet);
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

    const cacheKey = getSheetCacheKey(sheetName, query);
    const cached = getCachedJson(cacheKey);
    if (cached !== null) return jsonTextResponse(cached);

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const totalRows = Math.max(lastRow - 1, 0);
    const headers = getHeaderRow(sheet, lastColumn);

    if (lastRow < 2 || lastColumn < 1) {
      const emptyJson = structuredRead
        ? JSON.stringify({ items: [], page: query.page, limit: query.limit, total: 0, totalPages: 0 })
        : '[]';
      if (cacheKey) cacheJson(cacheKey, emptyJson);
      return jsonTextResponse(emptyJson);
    }

    const hasFilters = Boolean(
      query.search || query.status || query.provinceName || query.customerName
    );
    const offset = (query.page - 1) * query.limit;
    let matchingRows;
    let total;

    if (hasFilters) {
      // Sheets has no safe secondary index for these fields. A single batch read is
      // faster than many non-contiguous range calls, then only the requested page is serialized.
      const allRows = sheet.getRange(2, 1, totalRows, lastColumn).getValues();
      matchingRows = allRows.filter(createRowMatcher(headers, query));
      total = matchingRows.length;
      matchingRows = matchingRows.slice(offset, offset + query.limit);
    } else {
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
