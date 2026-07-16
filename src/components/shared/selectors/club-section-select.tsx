"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
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
import { listClubSections, type ClubSection } from "@/lib/api/clubs";

// ─── Re-export for consumers ───────────────────────────────────────────────────

/** Alias kept in sync with the backend ClubSection type. */
export type ClubSectionListItem = ClubSection;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * `listClubSections` returns either a bare array or a paginated envelope
 * `{ data: ClubSection[], ... }`. Normalize both shapes.
 */
function parseSectionList(payload: unknown): ClubSectionListItem[] {
  if (Array.isArray(payload)) return payload as ClubSectionListItem[];
  if (payload && typeof payload === "object") {
    const envelope = payload as { data?: unknown };
    if (Array.isArray(envelope.data)) return envelope.data as ClubSectionListItem[];
  }
  return [];
}

/**
 * Maps a sectionTypeKey string to the corresponding `club_type_id` integer.
 *
 * Convention confirmed in enroll-club-dialog.tsx:
 *   1 = Aventureros (adventurers)
 *   2 = Conquistadores (pathfinders)
 *   3 = Guías Mayores (master_guilds)
 */
const SECTION_TYPE_KEY_TO_ID: Record<string, number> = {
  adventurers: 1,
  pathfinders: 2,
  master_guilds: 3,
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClubSectionSelectProps {
  /** When null/undefined, the selector is disabled with a "select a club first" placeholder */
  clubId: number | null;
  value: number | null;
  onChange: (sectionId: number | null, section?: ClubSectionListItem) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Filter by section type key: 'adventurers' | 'pathfinders' | 'master_guilds'.
   * Applied client-side by mapping to club_type_id (1, 2, 3).
   */
  sectionTypeKey?: string;
  /** Filter by club_type_id directly (alternative to sectionTypeKey) */
  clubTypeId?: number;
  activeOnly?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClubSectionSelect({
  clubId,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  sectionTypeKey,
  clubTypeId,
  activeOnly,
}: ClubSectionSelectProps) {
  const t = useTranslations("selectors.clubSection");
  const [open, setOpen] = useState(false);
  // Lazy load: only enable the query once the popover has been opened at least once.
  const [hasOpened, setHasOpened] = useState(false);
  const previousClubId = useRef<number | null>(clubId ?? null);
  const [fetchedSections, setFetchedSections] = useState<ClubSectionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  // Reset value when clubId changes after the initial mount.
  // This preserves URL-hydrated default section values in GET filter forms.
  useEffect(() => {
    const nextClubId = clubId ?? null;
    if (previousClubId.current === nextClubId) return;

    previousClubId.current = nextClubId;
    onChange(null);
  }, [clubId, onChange]);

  const isDisabled = disabled || clubId == null;

  useEffect(() => {
    if (!hasOpened && value == null) return;
    if (clubId == null) {
      setFetchedSections([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    listClubSections(clubId)
      .then((payload) => {
        if (cancelled) return;
        setFetchedSections(parseSectionList(payload));
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
  }, [clubId, hasOpened, t, value]);

  // Resolve the effective club_type_id filter (sectionTypeKey takes precedence).
  const effectiveClubTypeId: number | undefined =
    sectionTypeKey !== undefined
      ? SECTION_TYPE_KEY_TO_ID[sectionTypeKey]
      : clubTypeId;

  // Apply optional filters.
  const sections: ClubSectionListItem[] = fetchedSections.filter((s) => {
    if (activeOnly && s.active === false) return false;
    if (effectiveClubTypeId !== undefined && s.club_type_id !== effectiveClubTypeId) return false;
    return true;
  });

  const error = fetchError
    ? fetchError instanceof Error
      ? fetchError.message
      : t("loadError")
    : null;

  function handleOpenChange(nextOpen: boolean) {
    if (isDisabled) return;
    setOpen(nextOpen);
    if (nextOpen && !hasOpened) setHasOpened(true);
  }

  const selected = sections.find((s) => s.club_section_id === value) ?? null;

  function handleSelect(sectionId: number) {
    const section = fetchedSections.find((s) => s.club_section_id === sectionId);
    if (sectionId === value) {
      onChange(null);
    } else {
      onChange(sectionId, section);
    }
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  const triggerPlaceholder =
    clubId == null
      ? t("placeholderNoClub")
      : placeholder ?? t("placeholder");

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={triggerPlaceholder}
          disabled={isDisabled}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          {selected ? (
            <span className="truncate text-sm">
              {selected.club_type?.name
                ? `${selected.club_type.name}${selected.name ? ` · ${selected.name}` : ""}`
                : selected.name}
            </span>
          ) : (
            <span className="truncate text-sm">{triggerPlaceholder}</span>
          )}

          <span className="ml-2 flex shrink-0 items-center gap-0.5">
            {selected && !isDisabled && (
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

            {!loading && !error && sections.length === 0 && (
              <CommandEmpty>{t("empty")}</CommandEmpty>
            )}

            {!loading && !error && sections.length > 0 && (
              <CommandGroup>
                {sections.map((section) => {
                  const label = section.club_type?.name
                    ? `${section.club_type.name}${section.name ? ` · ${section.name}` : ""}`
                    : section.name;
                  return (
                    <CommandItem
                      key={section.club_section_id}
                      value={`${label} ${section.club_section_id}`}
                      onSelect={() => handleSelect(section.club_section_id)}
                    >
                      <span className="truncate">{label}</span>

                      <Check
                        className={cn(
                          "ml-auto size-3.5 shrink-0",
                          value === section.club_section_id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
