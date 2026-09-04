import { createSheetMutationResponse } from '@/lib/sheet-mutation-response';
import { handleSheetPostRequest } from '@/lib/sheet-upstream';

const DEFAULT_SPARE_PART_SHEET = process.env.DEFAULT_PART_SHEET ?? 'เบิกอะไหล่';

export function POST(request: Request): Promise<Response> {
  return handleSheetPostRequest(
    request,
    DEFAULT_SPARE_PART_SHEET,
    'Failed to submit spare part',
    {},
    async response =>
      createSheetMutationResponse(await response.text(), {
        successMessage: 'บันทึกข้อมูล Spare Part สำเร็จ',
        failureMessage: 'Apps Script บันทึก Spare Part ไม่สำเร็จ',
      })
  );
}
