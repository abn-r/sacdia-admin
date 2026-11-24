"use client";

import { useEffect, useState, type ReactNode } from "react";

import { EMPTY_SIDEBAR_INSIGHTS, type SidebarInsights } from "@/lib/dashboard/sidebar-insights";

import { SidebarInsightsProvider } from "./sidebar-insights-context";

/**
 * Resolves the streamed insights promise once and shares scope name + queue
 * counts with the sidebar, the header user menu and the search dialog.
 */
export function InsightsBoundary({
  insights: promise,
  children,
}: {
  readonly insights?: Promise<SidebarInsights>;
  readonly children: ReactNode;
}) {
  const [insights, setInsights] = useState<SidebarInsights>(EMPTY_SIDEBAR_INSIGHTS);

  useEffect(() => {
    if (!promise) return;
    let cancelled = false;
    promise.then(
      (value) => {
        if (!cancelled) setInsights(value);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [promise]);

  return <SidebarInsightsProvider value={insights}>{children}</SidebarInsightsProvider>;
}
