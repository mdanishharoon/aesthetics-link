"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthApiError, getMe } from "@/lib/auth/client";
import type { AuthUser } from "@/types";

type AuthContextValue = {
  user: AuthUser | null;
  isPending: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, isPending: true });

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await getMe();
    return response.user;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user = null, isPending } = useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) return false;
      return failureCount < 1;
    },
  });

  return (
    <AuthContext.Provider value={{ user, isPending }}>
      {children}
    </AuthContext.Provider>
  );
}
