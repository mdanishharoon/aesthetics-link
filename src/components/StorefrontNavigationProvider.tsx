"use client";

import { createContext, useContext } from "react";

import type { StorefrontNavigation } from "@/types";

const StorefrontNavigationContext = createContext<StorefrontNavigation | null>(null);

export default function StorefrontNavigationProvider({
  children,
  navigation,
}: {
  children: React.ReactNode;
  navigation: StorefrontNavigation | null;
}) {
  return (
    <StorefrontNavigationContext.Provider value={navigation}>
      {children}
    </StorefrontNavigationContext.Provider>
  );
}

export function useStorefrontNavigation(): StorefrontNavigation | null {
  return useContext(StorefrontNavigationContext);
}

