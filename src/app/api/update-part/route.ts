import { createSheetMutationResponse } from '@/lib/sheet-mutation-response';
import { handleSheetPostRequest } from '@/lib/sheet-upstream';

export function POST(request: Request): Promise<Response> {
  return handleSheetPostRequest(
    request,
    'เบิกอะไหล่',
    'Failed to update spare part',
    { action: 'update' },
    async response =>
      createSheetMutationResponse(await response.text(), {
        successMessage: 'อัปเดตข้อมูล Spare Part สำเร็จ',
        failureMessage: 'Apps Script อัปเดต Spare Part ไม่สำเร็จ',
      })
  );
}
