const CLAIM_SHEET_NAME = 'ใบเคลม';
const SPARE_PART_SHEET_NAME = 'เบิกอะไหล่';
const READ_CACHE_SECONDS = 30;
const MAX_CACHE_BYTES = 90000;

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function jsonTextResponse(json) {
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function getSheetCacheKey(sheetName) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    sheetName,
    Utilities.Charset.UTF_8
  );
  return `sheet:${Utilities.base64EncodeWebSafe(digest)}`;
}

function clearSheetCache(sheetName) {
  CacheService.getScriptCache().remove(getSheetCacheKey(sheetName));
}

function getHeaderRow(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
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
    const sheetName = e && e.parameter && e.parameter.sheetName
      ? e.parameter.sheetName
      : CLAIM_SHEET_NAME;
    const cache = CacheService.getScriptCache();
    const cacheKey = getSheetCacheKey(sheetName);
    const cached = cache.get(cacheKey);
    if (cached !== null) return jsonTextResponse(cached);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error(`ไม่พบชีต '${sheetName}'`);

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn < 1) {
      const emptyJson = '[]';
      cache.put(cacheKey, emptyJson, READ_CACHE_SECONDS);
      return jsonTextResponse(emptyJson);
    }

    const data = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
    const headers = data[0];
    const result = data.slice(1).map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      return record;
    });

    const json = JSON.stringify(result);
    if (Utilities.newBlob(json).getBytes().length <= MAX_CACHE_BYTES) {
      cache.put(cacheKey, json, READ_CACHE_SECONDS);
    }

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
