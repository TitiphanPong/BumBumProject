import { handleSheetPostRequest } from '@/lib/sheet-upstream';

export function POST(request: Request) {
  const sheetName = process.env.DEFAULT_PART_SHEET || 'เบิกอะไหล่';
  return handleSheetPostRequest(
    request,
    sheetName,
    'Failed to submit spare-part request',
    {},
    async response => Response.json({ message: await response.text() })
  );
}
