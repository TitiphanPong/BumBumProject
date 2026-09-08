import { describe, expect, it } from 'vitest';
import {
  normalizeSheetMutationBody,
  SheetMutationValidationError,
} from './sheet-mutation-payload';

describe('normalizeSheetMutationBody', () => {
  it('canonicalizes legacy Claim casing and ignores privileged/unknown fields', () => {
    const payload = normalizeSheetMutationBody(
      {
        ProvinceName: 'กรุงเทพฯ',
        CustomerName: 'ลูกค้า',
        Phone: '0812345678',
        Address: 'Bangkok',
        Problem: 'เปิดไม่ติด',
        Warranty: 'อยู่ในประกัน',
        inspectstatus: 'รอตรวจสอบ',
        status: 'รอเคลม',
        action: 'delete',
        sheetName: 'ราคาอะไหล่และมอเตอร์',
        dangerous: 'ignored',
      },
      'claim',
      'create'
    );

    expect(payload).toMatchObject({
      provinceName: 'กรุงเทพฯ',
      customerName: 'ลูกค้า',
      phone: '0812345678',
      address: 'Bangkok',
      problem: 'เปิดไม่ติด',
      warranty: ['อยู่ในประกัน'],
      inspectstatus: 'รอตรวจสอบ',
      status: 'รอเคลม',
    });
    expect(payload).not.toHaveProperty('action');
    expect(payload).not.toHaveProperty('sheetName');
    expect(payload).not.toHaveProperty('dangerous');
  });

  it('flattens nested single-choice arrays from the edit form', () => {
    const payload = normalizeSheetMutationBody(
      {
        id: 'CLAIM-42',
        vehicleClaim: [['รถยนต์']],
        vehicleInspector: [['รถมอเตอร์ไซค์']],
      },
      'claim',
      'update'
    );

    expect(payload.vehicleClaim).toEqual(['รถยนต์']);
    expect(payload.vehicleInspector).toEqual(['รถมอเตอร์ไซค์']);
  });

  it('normalizes legacy empty values consistently by mutation kind', () => {
    expect(
      normalizeSheetMutationBody(
        { id: 'CLAIM-42', note: '', claimDate: '' },
        'claim',
        'update'
      )
    ).toMatchObject({ note: '-', claimDate: '-' });

    const created = normalizeSheetMutationBody(
      {
        provinceName: 'กรุงเทพฯ',
        customerName: 'ลูกค้า',
        phone: '0812345678',
        address: 'Bangkok',
        problem: 'เปิดไม่ติด',
        warranty: ['อยู่ในประกัน'],
        inspectstatus: 'รอตรวจสอบ',
        status: 'รอเคลม',
        note: '-',
      },
      'claim',
      'create'
    );
    expect(created.note).toBe('');
  });

  it('requires an id for updates and deletes', () => {
    expect(() => normalizeSheetMutationBody({}, 'spare', 'update')).toThrow(
      SheetMutationValidationError
    );
    expect(() => normalizeSheetMutationBody({}, 'claim', 'delete')).toThrow('id is required');
  });

  it('rejects unsupported Claim statuses', () => {
    expect(() =>
      normalizeSheetMutationBody(
        { id: 'CLAIM-42', status: 'เสร็จแบบไม่รู้จัก' },
        'claim',
        'update'
      )
    ).toThrow('status is not supported');
  });

  it('rejects invalid or Buddhist-year API dates', () => {
    expect(() =>
      normalizeSheetMutationBody(
        { id: 'CLAIM-42', buyProductDate: '2569-09-08' },
        'claim',
        'update'
      )
    ).toThrow('buyProductDate must be a valid Gregorian date');

    expect(() =>
      normalizeSheetMutationBody(
        { id: 'CLAIM-42', claimDate: '2026-02-31' },
        'claim',
        'update'
      )
    ).toThrow('claimDate must be a valid Gregorian date');
  });

  it('keeps only id for delete mutations', () => {
    expect(
      normalizeSheetMutationBody(
        { id: 'SPAREPART-9', action: 'update', customerName: 'ignored for delete' },
        'spare',
        'delete'
      )
    ).toEqual({ id: 'SPAREPART-9' });
  });
});
