import { createSheetMutationResponse } from '@/lib/sheet-mutation-response';
import { handleSheetPostRequest } from '@/lib/sheet-upstream';

export function POST(request: Request): Promise<Response> {
  return handleSheetPostRequest(
    request,
    'ใบเคลม',
    'Failed to update claim',
    { action: 'update' },
    async response =>
      createSheetMutationResponse(await response.text(), {
        successMessage: 'อัปเดตข้อมูล Claim สำเร็จ',
        failureMessage: 'Apps Script อัปเดต Claim ไม่สำเร็จ',
      })
  );
}
