import { handleSheetPostRequest } from '@/lib/sheet-upstream';

export function POST(request: Request) {
  return handleSheetPostRequest(request, 'เบิกอะไหล่', 'Failed to update spare part', {
    action: 'update',
  });
}
