export interface SheetMutationResponseOptions {
  successMessage: string;
  failureMessage: string;
  allowPlainTextSuccess?: boolean;
}

type SheetMutationPayload = Record<string, unknown>;

export type ParsedSheetMutationResponse =
  | {
      ok: true;
      status: 200;
      payload: SheetMutationPayload;
    }
  | {
      ok: false;
      status: 502;
      payload: SheetMutationPayload;
    };

function getNonEmptyMessage(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function parseSheetMutationResponse(
  text: string,
  options: SheetMutationResponseOptions,
): ParsedSheetMutationResponse {
  try {
    const data = JSON.parse(text) as unknown;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Mutation response is not an object');
    }

    const payload = data as SheetMutationPayload;

    if (payload.result === 'success') {
      return {
        ok: true,
        status: 200,
        payload: {
          ...payload,
          result: 'success',
          message: getNonEmptyMessage(payload.message) ?? options.successMessage,
        },
      };
    }

    return {
      ok: false,
      status: 502,
      payload: {
        result: 'error',
        message: getNonEmptyMessage(payload.message) ?? options.failureMessage,
        upstream: payload,
      },
    };
  } catch {
    const trimmed = text.trim();

    if (options.allowPlainTextSuccess && /success|successfully/i.test(trimmed)) {
      return {
        ok: true,
        status: 200,
        payload: {
          result: 'success',
          message: options.successMessage,
        },
      };
    }

    return {
      ok: false,
      status: 502,
      payload: {
        result: 'error',
        message: 'การตอบกลับจาก Apps Script ไม่ใช่ JSON ที่ถูกต้อง',
        upstreamText: text,
      },
    };
  }
}

export function createSheetMutationResponse(
  text: string,
  options: SheetMutationResponseOptions,
): Response {
  const result = parseSheetMutationResponse(text, options);
  return Response.json(result.payload, { status: result.status });
}
