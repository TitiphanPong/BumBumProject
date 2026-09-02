import { fetchUpstream, requireEnv, safeErrorResponse } from './upstream';
import { buildUpstreamReadUrl } from './upstream-query';

type SheetRequestBody = Record<string, unknown> & {
  sheetName?: unknown;
};

type SheetPostOptions = {
  action?: string;
  extra?: Record<string, unknown>;
};

type SheetPostOptionsResolver =
  | SheetPostOptions
  | ((body: SheetRequestBody) => SheetPostOptions);

type SheetResponseHandler = (
  response: Response,
  body: SheetRequestBody
) => Promise<Response> | Response;

function resolveSheetName(body: SheetRequestBody, defaultSheetName: string): string {
  return typeof body.sheetName === 'string' && body.sheetName ? body.sheetName : defaultSheetName;
}

async function postSheetRequest(
  body: SheetRequestBody,
  defaultSheetName: string,
  options: SheetPostOptions = {}
): Promise<Response> {
  const payload = {
    ...body,
    ...options.extra,
    sheetName: resolveSheetName(body, defaultSheetName),
    ...(options.action ? { action: options.action } : {}),
  };

  return fetchUpstream(requireEnv('GOOGLE_SCRIPT_URL'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function handleSheetPostRequest(
  request: Request,
  defaultSheetName: string,
  operation: string,
  options: SheetPostOptionsResolver = {},
  handleResponse: SheetResponseHandler = async response => Response.json(await response.json())
): Promise<Response> {
  try {
    const body = (await request.json()) as SheetRequestBody;
    const resolvedOptions = typeof options === 'function' ? options(body) : options;
    const response = await postSheetRequest(body, defaultSheetName, resolvedOptions);
    return await handleResponse(response, body);
  } catch (error: unknown) {
    return safeErrorResponse(error, operation);
  }
}

export async function fetchSheetJson(request: Request, sheetName: string): Promise<unknown> {
  const upstreamUrl = buildUpstreamReadUrl(requireEnv('GOOGLE_SCRIPT_URL'), sheetName, request);
  const response = await fetchUpstream(upstreamUrl);
  return response.json();
}

export function handleSheetDeleteRequest(
  request: Request,
  defaultSheetName: string,
  operation: string
): Promise<Response> {
  return handleSheetPostRequest(request, defaultSheetName, operation, { action: 'delete' });
}
