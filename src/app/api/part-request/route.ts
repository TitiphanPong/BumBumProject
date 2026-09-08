import { createSheetMutationResponse } from '@/lib/sheet-mutation-response';
import { handleSheetPostRequest } from '@/lib/sheet-upstream';

export function POST(request: Request): Promise<Response> {
  const sheetName = process.env.DEFAULT_PART_SHEET || 'เบิกอะไหล่';
  return handleSheetPostRequest(
    request,
    sheetName,
    'Failed to submit spare-part request',
    { action: 'add', mutation: { domain: 'spare', kind: 'create' } },
    async response =>
      createSheetMutationResponse(await response.text(), {
        successMessage: 'บันทึกข้อมูล Spare Part สำเร็จ',
        failureMessage: 'Apps Script บันทึก Spare Part ไม่สำเร็จ',
      })
  );
}
