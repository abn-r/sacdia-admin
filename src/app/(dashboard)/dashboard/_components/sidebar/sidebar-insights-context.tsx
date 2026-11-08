"use client";

import { createContext, useContext } from "react";

import {
  EMPTY_SIDEBAR_INSIGHTS,
  type SidebarInsights,
} from "@/lib/dashboard/sidebar-insights";

const SidebarInsightsContext = createContext<SidebarInsights>(EMPTY_SIDEBAR_INSIGHTS);

export const SidebarInsightsProvider = SidebarInsightsContext.Provider;

export function useSidebarInsights(): SidebarInsights {
  return useContext(SidebarInsightsContext);
}
