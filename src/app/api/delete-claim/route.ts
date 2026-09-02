import { handleSheetDeleteRequest } from '@/lib/sheet-upstream';

export function POST(request: Request) {
  return handleSheetDeleteRequest(request, 'ใบเคลม', 'Failed to delete claim');
}
