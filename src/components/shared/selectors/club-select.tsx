"use client";

import { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { listClubs, type Club } from "@/lib/api/clubs";

// ─── Re-export for consumers ───────────────────────────────────────────────────

/** Alias kept in sync with the backend Club type. */
export type ClubListItem = Club;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * `listClubs` returns either a bare array or a paginated envelope
 * `{ data: Club[], metadata: { ... } }`. Normalize both shapes.
 */
function parseClubList(payload: unknown): ClubListItem[] {
  if (Array.isArray(payload)) return payload as ClubListItem[];
  if (payload && typeof payload === "object") {
    const envelope = payload as { data?: unknown };
    if (Array.isArray(envelope.data)) return envelope.data as ClubListItem[];
  }
  return [];
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClubSelectProps {
  value: number | null;
  onChange: (clubId: number | null, club?: ClubListItem) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Optional filters forwarded to the endpoint */
  localFieldId?: number;
  districtId?: number;
  churchId?: number;
  activeOnly?: boolean;
  /** Pass a pre-loaded list to skip the fetch */
  clubs?: ClubListItem[];
  /** Called once when the list finishes loading so the parent can share it */
  onClubsLoaded?: (clubs: ClubListItem[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClubSelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  localFieldId,
  districtId,
  churchId,
  activeOnly,
  clubs: externalClubs,
  onClubsLoaded,
}: ClubSelectProps) {
  const t = useTranslations("selectors.club");
  const [open, setOpen] = useState(false);
  // Lazy load: only enable the query once the popover has been opened at least once.
  const [hasOpened, setHasOpened] = useState(false);

  const {
    data: fetchedClubs = [],
    isFetching: loading,
    error: fetchError,
  } = useQuery({
    queryKey: [
      "clubs-selector",
      { localFieldId, districtId, churchId, activeOnly },
    ],
    queryFn: async () => {
      const payload = await listClubs({
        localFieldId,
        districtId,
        churchId,
        active: activeOnly,
        limit: 1000,
        page: 1,
      });
      const clubs = parseClubList(payload);
      onClubsLoaded?.(clubs);
      return clubs;
    },
    enabled: (hasOpened || value != null) && externalClubs === undefined,
    staleTime: 60_000,
  });

  const clubs: ClubListItem[] = externalClubs ?? fetchedClubs;

  const error = fetchError
    ? fetchError instanceof Error
      ? fetchError.message
      : t("loadError")
    : null;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && !hasOpened) setHasOpened(true);
  }

  const selected = clubs.find((c) => c.club_id === value) ?? null;

  function handleSelect(clubId: number) {
    const club = clubs.find((c) => c.club_id === clubId);
    if (clubId === value) {
      onChange(null);
    } else {
      onChange(clubId, club);
    }
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
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          {selected ? (
            <span className="truncate text-sm">{selected.name}</span>
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

            {!loading && !error && clubs.length === 0 && (
              <CommandEmpty>{t("empty")}</CommandEmpty>
            )}

            {!loading && !error && clubs.length > 0 && (
              <CommandGroup>
                {clubs.map((club) => (
                  <CommandItem
                    key={club.club_id}
                    value={`${club.name} ${club.club_id}`}
                    onSelect={() => handleSelect(club.club_id)}
                  >
                    <span className="truncate">{club.name}</span>

                    <Check
                      className={cn(
                        "ml-auto size-3.5 shrink-0",
                        value === club.club_id ? "opacity-100" : "opacity-0",
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
