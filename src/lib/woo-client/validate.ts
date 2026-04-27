import type { ZodType } from "zod";

import { WooSchemaError } from "@/lib/woo-client/errors";

type ZodIssueLike = {
  path?: ReadonlyArray<string | number>;
  message?: string;
};

function formatPath(path: ReadonlyArray<string | number> | undefined): string {
  if (!path || path.length === 0) {
    return "<root>";
  }
  return path.join(".");
}

function isIssueArray(value: unknown): value is ZodIssueLike[] {
  return Array.isArray(value);
}

/**
 * Run a zod schema against an unknown value and throw a {@link WooSchemaError}
 * with a deterministic, single-line summary of every issue. The `context`
 * label appears at the start of the message so logs can identify which
 * boundary failed (e.g. `"GET /api/woo/cart"`).
 */
export function runSchema<T>(
  schema: ZodType<T>,
  value: unknown,
  context: string,
): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  const rawIssues: unknown = result.error.issues;
  const issues = isIssueArray(rawIssues)
    ? rawIssues.map(
        (issue) => `${formatPath(issue.path)}: ${issue.message ?? "invalid"}`,
      )
    : ["Schema validation failed."];

  throw new WooSchemaError(
    `Schema validation failed for ${context} (${issues.length} issue${issues.length === 1 ? "" : "s"}): ${issues.join("; ")}`,
    issues,
  );
}
