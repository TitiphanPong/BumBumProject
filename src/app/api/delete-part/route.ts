import { handleSheetDeleteRequest } from '@/lib/sheet-upstream';

export function POST(request: Request): Promise<Response> {
  return handleSheetDeleteRequest(request, 'เบิกอะไหล่', 'Failed to delete spare part', {
    successMessage: 'ลบข้อมูล Spare Part สำเร็จ',
    failureMessage: 'Apps Script ลบ Spare Part ไม่สำเร็จ',
  });
}
