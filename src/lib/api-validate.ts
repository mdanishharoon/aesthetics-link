import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";

type ParseFailure = { ok: false; response: NextResponse };
type ParseSuccess<T> = { ok: true; data: T };
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

function formatPath(path: ReadonlyArray<string | number> | undefined): string {
  if (!path || path.length === 0) {
    return "<root>";
  }
  return path.join(".");
}

type ZodIssueLike = {
  path?: ReadonlyArray<string | number>;
  message?: string;
};

function isIssueArray(value: unknown): value is ZodIssueLike[] {
  return Array.isArray(value);
}

function buildValidationResponse(
  message: string,
  rawIssues: unknown,
  status: number,
): NextResponse {
  const issues = isIssueArray(rawIssues)
    ? rawIssues.map(
        (issue) => `${formatPath(issue.path)}: ${issue.message ?? "invalid"}`,
      )
    : [];
  return NextResponse.json(
    { message, code: "validation_failed", issues },
    { status },
  );
}

/**
 * Parse and validate a JSON request body against a zod schema. On success
 * returns `{ ok: true, data }`. On failure returns `{ ok: false, response }`
 * where `response` is a 400 NextResponse with structured issue paths.
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Request body must be valid JSON.", code: "invalid_json" },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: buildValidationResponse(
        "Invalid request body.",
        result.error.issues,
        400,
      ),
    };
  }
  return { ok: true, data: result.data };
}

/**
 * Validate URL search params against a zod schema. Same shape as
 * {@link parseJsonBody}.
 */
export function parseSearchParams<T>(
  request: NextRequest,
  schema: ZodType<T>,
): ParseResult<T> {
  const params: Record<string, string> = {};
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    params[key] = value;
  }
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      ok: false,
      response: buildValidationResponse(
        "Invalid query parameters.",
        result.error.issues,
        400,
      ),
    };
  }
  return { ok: true, data: result.data };
}
