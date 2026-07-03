"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ComponentType, ReactNode } from "react";

const SessionProvider = NextAuthSessionProvider as unknown as ComponentType<{
  children: ReactNode;
  refetchOnWindowFocus?: boolean;
}>;

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
