"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  listEcclesiasticalYears,
  type EcclesiasticalYear,
} from "@/lib/api/catalogs";

// ─── Re-export type for consumers ─────────────────────────────────────────────

export type { EcclesiasticalYear };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const [year, month, day] = iso.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EcclesiasticalYearSelectProps {
  value: number | null;
  onChange: (yearId: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Pass a pre-loaded list to avoid redundant fetches across multiple instances */
  years?: EcclesiasticalYear[];
  /** Called when the list finishes loading so the parent can share it */
  onYearsLoaded?: (years: EcclesiasticalYear[]) => void;
  /** Show only active years. Default: true */
  activeOnly?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EcclesiasticalYearSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  years: externalYears,
  onYearsLoaded,
  activeOnly = true,
}: EcclesiasticalYearSelectProps) {
  const t = useTranslations("selectors.ecclesiasticalYear");
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [fetchedYears, setFetchedYears] = useState<EcclesiasticalYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  useEffect(() => {
    if (externalYears !== undefined) return;
    if (!hasOpened && value == null) return;

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    listEcclesiasticalYears()
      .then((data) => {
        if (cancelled) return;
        onYearsLoaded?.(data);
        setFetchedYears(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setFetchError(error instanceof Error ? error : new Error(t("loadError")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [externalYears, hasOpened, onYearsLoaded, t, value]);

  const allYears: EcclesiasticalYear[] = externalYears ?? fetchedYears;

  const years: EcclesiasticalYear[] = activeOnly
    ? allYears.filter((y) => y.active)
    : allYears;

  const error = fetchError
    ? fetchError instanceof Error
      ? fetchError.message
      : t("loadError")
    : null;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && !hasOpened) setHasOpened(true);
  }

  const selected = allYears.find((y) => y.ecclesiastical_year_id === value) ?? null;

  function handleSelect(yearId: number) {
    onChange(yearId === value ? null : yearId);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder ?? t("placeholder")}
          aria-controls="ecclesiastical-year-listbox"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm">{selected.name}</span>
              {selected.active && (
                <Badge variant="secondary" className="shrink-0">
                  {t("activeBadge")}
                </Badge>
              )}
            </span>
          ) : (
            <span className="truncate text-sm">{placeholder ?? t("placeholder")}</span>
          )}

          <span className="ml-2 flex shrink-0 items-center gap-0.5">
            {selected && !disabled && (
              <span
                role="button"
                aria-label={t("clearSelection")}
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="size-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        id="ecclesiastical-year-listbox"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={t("searchPlaceholder")} />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t("loading")}
              </div>
            )}

            {!loading && error && (
              <div className="py-6 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && years.length === 0 && (
              <CommandEmpty>{t("empty")}</CommandEmpty>
            )}

            {!loading && !error && years.length > 0 && (
              <CommandGroup>
                {years.map((year) => (
                  <CommandItem
                    key={year.ecclesiastical_year_id}
                    value={`${year.name} ${year.ecclesiastical_year_id}`}
                    onSelect={() => handleSelect(year.ecclesiastical_year_id)}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm">{year.name}</span>
                        {year.active && (
                          <Badge variant="secondary" className="shrink-0">
                            {t("activeBadge")}
                          </Badge>
                        )}
                      </div>
                      {year.start_date && year.end_date && (
                        <span className="text-xs text-muted-foreground">
                          {formatDateRange(year.start_date, year.end_date)}
                        </span>
                      )}
                    </div>

                    <Check
                      className={cn(
                        "ml-auto size-3.5 shrink-0",
                        value === year.ecclesiastical_year_id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
