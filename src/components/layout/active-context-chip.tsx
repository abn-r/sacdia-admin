"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2, CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveContext } from "@/lib/context/active-context";
import { listClubs, type Club } from "@/lib/api/clubs";
import {
  listEcclesiasticalYears,
  getActiveEcclesiasticalYearId,
  type EcclesiasticalYear,
} from "@/lib/api/catalogs";

const STALE = 5 * 60_000;
const GC = 10 * 60_000;

function parseClubList(data: unknown): Club[] {
  if (Array.isArray(data)) return data as Club[];
  const paged = data as { data?: unknown } | null;
  if (paged && Array.isArray(paged.data)) return paged.data as Club[];
  return [];
}

export function ActiveContextChip() {
  const t = useTranslations("nav.activeContext");
  const { activeClubId, activeYearId, setActiveClubId, setActiveYearId } =
    useActiveContext();

  // Flag para el seteo automático inicial del año — solo una vez
  const autoYearSet = useRef(false);

  const clubsQuery = useQuery({
    queryKey: ["clubs", "list-for-context"],
    queryFn: () => listClubs({ active: true }),
    staleTime: STALE,
    gcTime: GC,
  });

  const yearsQuery = useQuery({
    queryKey: ["ecclesiastical-years", "all"],
    queryFn: () => listEcclesiasticalYears(),
    staleTime: STALE,
    gcTime: GC,
  });

  const clubs = parseClubList(clubsQuery.data);
  const years = Array.isArray(yearsQuery.data)
    ? (yearsQuery.data as EcclesiasticalYear[])
    : [];

  // Autoseleccionar club si solo hay uno
  useEffect(() => {
    if (clubs.length === 1 && activeClubId === null) {
      setActiveClubId(clubs[0].club_id);
    }
  }, [clubs, activeClubId, setActiveClubId]);

  // Setear año activo automáticamente en primera carga sin valor guardado
  useEffect(() => {
    if (activeYearId !== null || autoYearSet.current) return;
    if (!yearsQuery.isSuccess) return;

    autoYearSet.current = true;
    void getActiveEcclesiasticalYearId().then((id) => {
      if (id !== null) setActiveYearId(id);
    });
  }, [yearsQuery.isSuccess, activeYearId, setActiveYearId]);

  const isLoading = clubsQuery.isPending || yearsQuery.isPending;
  const isError = clubsQuery.isError || yearsQuery.isError;

  if (isLoading) {
    return (
      <Skeleton className="h-8 w-36 rounded-full shrink-0 hidden md:block" />
    );
  }

  if (isError) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-8 shrink-0 text-muted-foreground text-xs"
      >
        {t("unavailable")}
      </Button>
    );
  }

  const activeClub = clubs.find((c) => c.club_id === activeClubId) ?? null;
  const activeYear = years.find((y) => y.ecclesiastical_year_id === activeYearId) ?? null;

  function handleClear() {
    setActiveClubId(null);
    setActiveYearId(null);
    autoYearSet.current = false;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs font-normal text-muted-foreground hover:text-foreground border-border/60"
        >
          {/* Club */}
          <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden md:inline truncate max-w-[10rem]">
            {activeClub?.name ?? t("noClub")}
          </span>

          {/* Separador vertical */}
          <span
            className="mx-0.5 h-3 w-px bg-border shrink-0 hidden md:inline-block"
            aria-hidden="true"
          />

          {/* Año */}
          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden md:inline truncate max-w-[6rem]">
            {activeYear?.name ?? t("noYear")}
          </span>

          <ChevronDown className="size-3 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* ── Clubs ── */}
        <DropdownMenuLabel>{t("clubLabel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeClubId !== null ? String(activeClubId) : ""}
          onValueChange={(val) =>
            setActiveClubId(val ? parseInt(val, 10) : null)
          }
        >
          {clubs.map((club) => (
            <DropdownMenuRadioItem
              key={club.club_id}
              value={String(club.club_id)}
              className="text-sm"
            >
              {club.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* ── Años eclesiásticos ── */}
        <DropdownMenuLabel>{t("yearLabel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeYearId !== null ? String(activeYearId) : ""}
          onValueChange={(val) =>
            setActiveYearId(val ? parseInt(val, 10) : null)
          }
        >
          {years.map((year) => (
            <DropdownMenuRadioItem
              key={year.ecclesiastical_year_id}
              value={String(year.ecclesiastical_year_id)}
              className="text-sm"
            >
              {year.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={handleClear}
          className="text-xs text-muted-foreground"
        >
          {t("clear")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
