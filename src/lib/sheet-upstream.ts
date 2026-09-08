import {
  createSheetMutationErrorResponse,
  createSheetMutationResponse,
  type SheetMutationResponseOptions,
} from './sheet-mutation-response';
import {
  normalizeSheetMutationBody,
  SheetMutationValidationError,
  type SheetMutationDomain,
  type SheetMutationKind,
} from './sheet-mutation-payload';
import { fetchUpstream, requireEnv } from './upstream';
import { buildUpstreamReadUrl } from './upstream-query';

type SheetRequestBody = Record<string, unknown> & {
  sheetName?: unknown;
};

type SheetPostOptions = {
  action?: 'add' | 'update' | 'delete';
  extra?: Record<string, unknown>;
  mutation?: {
    domain: SheetMutationDomain;
    kind: SheetMutationKind;
  };
};

type SheetPostOptionsResolver =
  | SheetPostOptions
  | ((body: SheetRequestBody) => SheetPostOptions);

type SheetResponseHandler = (
  response: Response,
  body: SheetRequestBody
) => Promise<Response> | Response;

async function postSheetRequest(
  body: SheetRequestBody,
  defaultSheetName: string,
  options: SheetPostOptions = {}
): Promise<Response> {
  const { sheetName: _ignoredSheetName, action: _ignoredAction, ...businessFields } = body;
  const payload = {
    ...businessFields,
    ...options.extra,
    sheetName: defaultSheetName,
    action: options.action ?? 'add',
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
    const rawBody = await request.json();
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      throw new SheetMutationValidationError('Request body must be a JSON object');
    }

    const requestBody = rawBody as SheetRequestBody;
    const resolvedOptions = typeof options === 'function' ? options(requestBody) : options;
    const body = resolvedOptions.mutation
      ? normalizeSheetMutationBody(
          requestBody,
          resolvedOptions.mutation.domain,
          resolvedOptions.mutation.kind
        )
      : requestBody;
    const response = await postSheetRequest(body, defaultSheetName, resolvedOptions);
    return await handleResponse(response, body);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return Response.json(
        { result: 'error', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }
    if (error instanceof SheetMutationValidationError) {
      return Response.json({ result: 'error', message: error.message }, { status: 400 });
    }
    return createSheetMutationErrorResponse(error, operation);
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
  operation: string,
  domain: SheetMutationDomain,
  responseOptions: SheetMutationResponseOptions
): Promise<Response> {
  return handleSheetPostRequest(
    request,
    defaultSheetName,
    operation,
    { action: 'delete', mutation: { domain, kind: 'delete' } },
    async response => createSheetMutationResponse(await response.text(), responseOptions)
  );
}
