"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface UrlTabItem {
  value: string;
  label: string;
  count?: number;
  /** Overrides the computed URL (e.g. when the tab changes the path). */
  href?: string;
}

export interface UrlTabsProps {
  param?: string;
  tabs: UrlTabItem[];
  defaultValue: string;
  className?: string;
  ariaLabel?: string;
}

/** Active value of a URL-driven tab group, for rendering the matching content. */
export function useUrlTab(param = "tab", defaultValue: string): string {
  const searchParams = useSearchParams();
  return searchParams?.get(param) ?? defaultValue;
}

export function UrlTabs({ param = "tab", tabs, defaultValue, className, ariaLabel }: UrlTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useUrlTab(param, defaultValue);

  const select = useCallback(
    (tab: UrlTabItem) => {
      if (tab.href) {
        router.replace(tab.href, { scroll: false });
        return;
      }
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      if (tab.value === defaultValue) next.delete(param);
      else next.set(param, tab.value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, param, defaultValue],
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex items-center gap-1 overflow-x-auto border-b", className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => select(tab)}
            className={cn(
              "-mb-px inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 font-medium text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 font-medium text-2xs tabular-nums leading-5",
                  isActive ? "bg-primary-soft text-primary-soft-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
