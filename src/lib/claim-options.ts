export type ClaimOption = {
  value: string;
  label: string;
};

export const PROVINCE_OPTIONS: ClaimOption[] = [
  { value: 'กรุงเทพฯ', label: 'กรุงเทพฯ' },
  { value: 'อำนาจเจริญ', label: 'อำนาจเจริญ' },
  { value: 'โคราช', label: 'โคราช' },
];

export const PROVINCE_EDIT_OPTIONS: ClaimOption[] = [
  ...PROVINCE_OPTIONS,
  { value: 'อื่นๆ', label: 'อื่นๆ' },
];

export const WARRANTY_OPTIONS: ClaimOption[] = [
  { value: 'อยู่ในประกัน', label: 'อยู่ในประกัน' },
  { value: 'หมดประกัน', label: 'หมดประกัน' },
];

export const VEHICLE_OPTIONS: ClaimOption[] = [
  { value: 'รถยนต์', label: 'รถยนต์' },
  { value: 'รถมอเตอร์ไซค์', label: 'รถมอเตอร์ไซค์' },
];

export const VEHICLE_EDIT_OPTIONS: ClaimOption[] = [
  { value: 'รถยนต์', label: 'รถยนต์' },
  { value: 'รถมอเตอร์ไซค์', label: 'มอเตอร์ไซค์' },
  { value: 'อื่นๆ', label: 'อื่นๆ' },
];

export const INSPECTION_STATUS_OPTIONS: ClaimOption[] = [
  { value: 'ไปตรวจสอบเอง', label: 'ไปตรวจสอบเอง' },
  { value: 'รอตรวจสอบ', label: 'รอตรวจสอบ' },
  { value: 'จบการตรวจสอบ', label: 'จบการตรวจสอบ' },
  { value: 'ยกเลิกการตรวจสอบ', label: 'ยกเลิกการตรวจสอบ' },
];

export const CLAIM_STATUS_OPTIONS: ClaimOption[] = [
  { value: 'ไปเคลมเอง', label: 'ไปเคลมเอง' },
  { value: 'รอเคลม', label: 'รอเคลม' },
  { value: 'จบเคลม', label: 'จบเคลม' },
  { value: 'ยกเลิกเคลม', label: 'ยกเลิกเคลม' },
];

export const SERVICE_CHARGE_OPTIONS: ClaimOption[] = [
  { value: 'หักค่าบริการแล้ว', label: 'หักค่าบริการแล้ว' },
  { value: 'ยังไม่หักค่าบริการ', label: 'ยังไม่หักค่าบริการ' },
];
