import "server-only";

import type { ZodType } from "zod";

import { getGraphQLUrl } from "@/lib/storefront/config";
import { WooClientError, wooFetch } from "@/lib/woo-client";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string; path?: ReadonlyArray<string | number> }>;
};

type GqlOptions = {
  tags?: string[];
  revalidate?: number;
};

/**
 * Execute a GraphQL query against the configured WordPress endpoint. If a
 * `schema` is provided, the `data` field is validated before return; the
 * GraphQL `errors[]` array is always inspected and surfaced as a
 * {@link WooClientError}.
 */
export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: GqlOptions,
  schema?: ZodType<T>,
): Promise<T> {
  const url = getGraphQLUrl();
  if (!url) {
    throw new Error("GraphQL endpoint not configured. Set WORDPRESS_GRAPHQL_URL in your environment.");
  }

  const envelope = await wooFetch<GraphQLResponse<T>>(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      next: {
        revalidate: options?.revalidate ?? 300,
        tags: options?.tags ?? [],
      },
    },
    { context: "POST GraphQL" },
  );

  if (envelope.errors && envelope.errors.length > 0) {
    const message = envelope.errors
      .map((entry) => entry.message ?? "Unknown GraphQL error")
      .join("; ");
    throw new WooClientError(`GraphQL request returned errors: ${message}`, 0, "graphql_error");
  }

  if (envelope.data === undefined) {
    throw new WooClientError("GraphQL response missing `data` field.", 0, "graphql_no_data");
  }

  if (schema) {
    return schema.parse(envelope.data);
  }

  return envelope.data;
}
