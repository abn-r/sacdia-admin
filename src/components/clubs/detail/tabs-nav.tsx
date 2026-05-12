"use client";

import { cn } from "@/lib/utils";

export type ClubTabId =
  | "overview"
  | "sections"
  | "units"
  | "membership"
  | "info"
  | "history"
  | "edit";

export interface ClubTabDef {
  id: ClubTabId;
  label: string;
  count?: number | null;
}

interface TabsNavProps {
  tabs: ClubTabDef[];
  value: ClubTabId;
  onChange: (id: ClubTabId) => void;
  className?: string;
}

export function ClubTabsNav({ tabs, value, onChange, className }: TabsNavProps) {
  return (
    <div
      role="tablist"
      aria-label="Secciones del detalle del club"
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted p-1",
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
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count != null && (
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
            )}
          </button>
        );
      })}
    </div>
  );
}
