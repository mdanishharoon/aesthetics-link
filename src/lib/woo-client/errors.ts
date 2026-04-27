/**
 * Shared error types and introspection helpers used by every fetch path that
 * talks to WooCommerce (browser → /api proxy, server → upstream REST, server →
 * upstream GraphQL).
 */

export const RETRYABLE_NETWORK_CODES: ReadonlySet<string> = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_ABORTED",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

export class WooClientError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "WooClientError";
    this.status = status;
    this.code = code;
  }
}

export class WooSchemaError extends WooClientError {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[]) {
    super(message, 0, "schema_validation_failed");
    this.name = "WooSchemaError";
    this.issues = issues;
  }
}

export class WooNetworkError extends WooClientError {
  constructor(message: string, code?: string) {
    super(message, 0, code ?? "network_error");
    this.name = "WooNetworkError";
  }
}

function hasStringProperty<K extends string>(
  value: unknown,
  key: K,
): value is Record<K, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    key in value &&
    typeof (value as Record<string, unknown>)[key] === "string"
  );
}

function hasProperty<K extends string>(
  value: unknown,
  key: K,
): value is Record<K, unknown> {
  return typeof value === "object" && value !== null && key in value;
}

/**
 * Extract a Node-style error code (e.g. `ECONNRESET`, `UND_ERR_SOCKET`) from an
 * error or its `.cause`. Replaces the unsafe `error as { code?: unknown }`
 * pattern previously used in the WooCommerce proxy route.
 */
export function extractErrorCode(error: unknown): string | null {
  if (hasStringProperty(error, "code")) {
    return error.code;
  }

  if (hasProperty(error, "cause") && hasStringProperty(error.cause, "code")) {
    return error.cause.code;
  }

  return null;
}

export function extractErrorCause(error: unknown): unknown {
  return hasProperty(error, "cause") ? error.cause : null;
}

export function isRetryableNetworkError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return Boolean(code && RETRYABLE_NETWORK_CODES.has(code));
}

/** Pull a string `message` field out of an arbitrary upstream error payload. */
export function extractErrorMessage(payload: unknown): string | null {
  return hasStringProperty(payload, "message") ? payload.message : null;
}

export function extractErrorPayloadCode(payload: unknown): string | null {
  return hasStringProperty(payload, "code") ? payload.code : null;
}
