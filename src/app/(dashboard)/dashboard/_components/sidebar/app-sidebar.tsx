"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { useSidebarItems } from "@/navigation/sidebar/use-sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { EMPTY_SIDEBAR_INSIGHTS, type SidebarInsights } from "@/lib/dashboard/sidebar-insights";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { SidebarInsightsProvider } from "./sidebar-insights-context";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Scope name + queue counts. Resolved on the server without blocking render. */
  readonly insights?: Promise<SidebarInsights>;
};

function useResolvedInsights(promise: Promise<SidebarInsights> | undefined): SidebarInsights {
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

  return insights;
}

export function AppSidebar({ insights: insightsPromise, ...props }: AppSidebarProps) {
  const insights = useResolvedInsights(insightsPromise);
  const sidebarItems = useSidebarItems();
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <SidebarInsightsProvider value={insights}>
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={APP_CONFIG.name}
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link prefetch={false} href="/dashboard" aria-label={APP_CONFIG.name}>
                <div className="size-5 shrink-0 overflow-hidden rounded-md group-data-[collapsible=icon]:size-4">
                  <Image
                    src="/app-icon.jpg"
                    alt=""
                    width={32}
                    height={32}
                    className="size-full object-cover"
                  />
                </div>
                <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-base">{APP_CONFIG.name}</span>
                  {insights.scopeName ? (
                    <span
                      className="truncate text-xs font-normal text-muted-foreground"
                      title={insights.scopeName}
                    >
                      {insights.scopeName}
                    </span>
                  ) : null}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
    </SidebarInsightsProvider>
  );
}
