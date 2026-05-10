"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />

      {/* Vertical divider */}
      <div className="h-4 w-px bg-border" />

      <AppBreadcrumbs />

      {/* Right side: theme toggle. Future: <ActiveContextChip /> once active club / ecclesiastical year data source exists. */}
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
      </div>
    </header>
  );
}
