"use client";

import { cn } from "@/lib/utils";

export type ClubMainTabId =
  | "overview"
  | "sections"
  | "responsables"
  | "units"
  | "membership"
  | "history"
  | "info";

/** @deprecated Responsables is now a main tab */
export type ClubSubPanelId = "responsables";

/** @deprecated Use ClubMainTabId — kept for gradual migration */
export type ClubTabId = ClubMainTabId | ClubSubPanelId | "sections" | "responsables" | "edit";

export interface ClubTabDef {
  id: ClubMainTabId;
  label: string;
  count?: number | null;
}

interface TabsNavProps {
  tabs: ClubTabDef[];
  value: ClubMainTabId;
  onChange: (id: ClubMainTabId) => void;
  className?: string;
  ariaLabel?: string;
}

export function ClubTabsNav({
  tabs,
  value,
  onChange,
  className,
  ariaLabel = "Club detail sections",
}: TabsNavProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full flex-wrap gap-1 rounded-xl border border-border bg-muted p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-background text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
