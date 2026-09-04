import { handleSheetDeleteRequest } from '@/lib/sheet-upstream';

export function POST(request: Request): Promise<Response> {
  return handleSheetDeleteRequest(request, 'ใบเคลม', 'Failed to delete claim', {
    successMessage: 'ลบข้อมูล Claim สำเร็จ',
    failureMessage: 'Apps Script ลบ Claim ไม่สำเร็จ',
  });
}
