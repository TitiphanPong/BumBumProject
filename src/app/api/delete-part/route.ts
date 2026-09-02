import { handleSheetDeleteRequest } from '@/lib/sheet-upstream';

export function POST(request: Request) {
  return handleSheetDeleteRequest(request, 'เบิกอะไหล่', 'Failed to delete spare part');
}
