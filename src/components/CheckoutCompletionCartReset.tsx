"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { clearCachedCartSnapshot } from "@/lib/storefront/client";
import type { StorefrontCart } from "@/types";

const EMPTY_CART: StorefrontCart = {
  items: [],
  itemCount: 0,
  subtotal: "$0.00",
  shipping: "$0.00",
  tax: "$0.00",
  total: "$0.00",
  currencySymbol: "$",
  needsShipping: false,
};

export default function CheckoutCompletionCartReset({
  shouldReset,
}: {
  shouldReset: boolean;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!shouldReset) {
      return;
    }

    clearCachedCartSnapshot();
    queryClient.setQueryData<StorefrontCart>(["storefront", "cart"], EMPTY_CART);

    const params = new URLSearchParams(window.location.search);
    if (params.has("just_completed")) {
      params.delete("just_completed");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [queryClient, shouldReset]);

  return null;
}
