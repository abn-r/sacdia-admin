"use client";

import { useState, type PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/api/query-client";

export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
