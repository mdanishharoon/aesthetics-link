import type { ZodType } from "zod";

import {
  WooClientError,
  WooNetworkError,
  extractErrorCode,
  extractErrorMessage,
  extractErrorPayloadCode,
  isRetryableNetworkError,
} from "@/lib/woo-client/errors";
import { runSchema } from "@/lib/woo-client/validate";

export type RetryOptions = {
  /** Maximum total attempts (including the first). 1 disables retries. */
  attempts: number;
  /** Backoff in ms before retry N (1-indexed). Default: 150 * attempt. */
  backoffMs?: (attempt: number) => number;
};

export type WooFetchOptions<T> = {
  /** Identifies this call in error messages (e.g. "GET /cart"). */
  context: string;
  /** Optional zod schema applied to the parsed JSON body. */
  schema?: ZodType<T>;
  /** Retry policy for transient network errors. Default: no retries. */
  retry?: RetryOptions;
  /** Fallback returned on a successful but empty response body. */
  emptyBodyFallback?: T;
  /**
   * Map an upstream non-OK payload to an error. Default builds a
   * {@link WooClientError} from `payload.message` + `payload.code`.
   */
  onUpstreamError?: (payload: unknown, response: Response) => never;
};

function defaultBackoff(attempt: number): number {
  return 150 * attempt;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Low-level retrying fetch. Returns the raw `Response`. Used by:
 * - {@link wooFetch} to feed JSON parsing
 * - the `/api/woo/[...path]` proxy, which forwards the body verbatim
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retry?: RetryOptions,
): Promise<Response> {
  const attempts = Math.max(1, retry?.attempts ?? 1);
  const backoff = retry?.backoffMs ?? defaultBackoff;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableNetworkError(error)) {
        throw error;
      }
      await sleep(backoff(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new WooNetworkError("Unknown upstream request error.");
}

function defaultUpstreamError(payload: unknown, response: Response): never {
  const message =
    extractErrorMessage(payload) ?? `Request failed (${response.status})`;
  const code = extractErrorPayloadCode(payload) ?? undefined;
  throw new WooClientError(message, response.status, code);
}

/**
 * High-level fetch:
 *  1. Performs the request with optional retries.
 *  2. Translates network failures into {@link WooNetworkError}.
 *  3. On non-2xx, parses the body and throws {@link WooClientError} (or the
 *     supplied `onUpstreamError` mapper).
 *  4. On 2xx, parses JSON, optionally validates with a zod schema, and
 *     returns the typed value.
 */
export async function wooFetch<T>(
  url: string,
  init: RequestInit,
  options: WooFetchOptions<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithRetry(url, init, options.retry);
  } catch (error) {
    if (error instanceof WooClientError) {
      throw error;
    }
    const code = extractErrorCode(error) ?? "network_error";
    throw new WooNetworkError(
      `Network error reaching ${options.context} (${code}).`,
      code,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let payload: unknown = null;
  if (isJson) {
    try {
      const text = await response.text();
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    (options.onUpstreamError ?? defaultUpstreamError)(payload, response);
  }

  if (payload === null && options.emptyBodyFallback !== undefined) {
    payload = options.emptyBodyFallback;
  }

  if (options.schema) {
    return runSchema(options.schema, payload, options.context);
  }

  return payload as T;
}
