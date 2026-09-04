import { createSheetMutationResponse } from '@/lib/sheet-mutation-response';
import { handleSheetPostRequest } from '@/lib/sheet-upstream';

const DEFAULT_CLAIM_SHEET = process.env.DEFAULT_CLAIM_SHEET ?? 'ใบเคลม';

export function POST(request: Request): Promise<Response> {
  return handleSheetPostRequest(
    request,
    DEFAULT_CLAIM_SHEET,
    'Failed to submit claim',
    body => ({
      extra: {
        image: body.image || '',
      },
    }),
    async response =>
      createSheetMutationResponse(await response.text(), {
        successMessage: 'บันทึกข้อมูล Claim สำเร็จ',
        failureMessage: 'Apps Script บันทึก Claim ไม่สำเร็จ',
        allowPlainTextSuccess: true,
      })
  );
}
