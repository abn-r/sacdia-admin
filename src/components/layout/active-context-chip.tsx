"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2, CalendarDays, ChevronDown } from "lucide-react";
import { toast } from "sonner";
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
import { useAuth } from "@/lib/auth/auth-context";
import { useActiveContext } from "@/lib/context/active-context";
import { setActiveClubContext } from "@/lib/api/auth-context";
import { ApiError } from "@/lib/api/client";
import {
  listEcclesiasticalYears,
  getActiveEcclesiasticalYearId,
  type EcclesiasticalYear,
} from "@/lib/api/catalogs";
import { abbreviateLabel, abbreviateYearLabel } from "@/lib/ui/abbreviate-label";

const STALE = 5 * 60_000;
const GC = 10 * 60_000;

type AssignmentOption = {
  assignmentId: string;
  roleName: string | null;
  clubId: number;
  clubName: string;
  sectionLabel: string | null;
};

type RawClubAssignment = {
  assignment_id?: unknown;
  role_name?: unknown;
  status?: unknown;
  club?: {
    club_id?: unknown;
    club_name?: unknown;
  };
  section?: {
    club_section_id?: unknown;
    club_type_name?: unknown;
    name?: unknown;
  };
};

function parseAssignmentOption(grant: unknown): AssignmentOption | null {
  if (!grant || typeof grant !== "object") return null;

  const record = grant as RawClubAssignment;
  const assignmentId = record.assignment_id;
  const clubId = record.club?.club_id;
  const clubName = record.club?.club_name;

  if (
    typeof assignmentId !== "string" ||
    typeof clubId !== "number" ||
    !Number.isFinite(clubId) ||
    typeof clubName !== "string"
  ) {
    return null;
  }

  if (record.status !== undefined && record.status !== "active") {
    return null;
  }

  const roleName =
    typeof record.role_name === "string" ? record.role_name : null;
  const sectionLabel =
    typeof record.section?.name === "string"
      ? record.section.name
      : typeof record.section?.club_type_name === "string"
        ? record.section.club_type_name
        : null;

  return {
    assignmentId,
    roleName,
    clubId,
    clubName,
    sectionLabel,
  };
}

function formatAssignment(option: AssignmentOption) {
  const parts = [option.clubName, option.sectionLabel, option.roleName].filter(
    (part): part is string => Boolean(part),
  );
  return parts.join(" · ");
}

export function ActiveContextChip() {
  const t = useTranslations("nav.activeContext");
  const router = useRouter();
  const { user, isLoading: authLoading, refresh } = useAuth();
  const { activeClubId, activeYearId, setActiveClubId, setActiveYearId } =
    useActiveContext();
  const [isChangingAssignment, setIsChangingAssignment] = useState(false);

  // Flag para el seteo automático inicial del año — solo una vez
  const autoYearSet = useRef(false);

  const yearsQuery = useQuery({
    queryKey: ["ecclesiastical-years", "all"],
    queryFn: () => listEcclesiasticalYears(),
    staleTime: STALE,
    gcTime: GC,
  });

  const assignments = useMemo(() => {
    const grants = user?.authorization?.grants?.club_assignments;
    if (!Array.isArray(grants)) return [];

    return grants
      .map(parseAssignmentOption)
      .filter((option): option is AssignmentOption => option !== null);
  }, [user]);

  const activeAssignmentId =
    user?.authorization?.active_assignment?.assignment_id ?? null;
  const activeAssignment =
    assignments.find((option) => option.assignmentId === activeAssignmentId) ??
    null;

  const years = Array.isArray(yearsQuery.data)
    ? (yearsQuery.data as EcclesiasticalYear[])
    : [];

  // Mantener el contexto local legado sincronizado con el contexto canónico del backend.
  useEffect(() => {
    if (!activeAssignment) return;
    if (activeClubId === activeAssignment.clubId) return;

    setActiveClubId(activeAssignment.clubId);
  }, [activeAssignment, activeClubId, setActiveClubId]);

  // Setear año activo automáticamente en primera carga sin valor guardado
  useEffect(() => {
    if (activeYearId !== null || autoYearSet.current) return;
    if (!yearsQuery.isSuccess) return;

    autoYearSet.current = true;
    void getActiveEcclesiasticalYearId().then((id) => {
      if (id !== null) setActiveYearId(id);
    });
  }, [yearsQuery.isSuccess, activeYearId, setActiveYearId]);

  const handleAssignmentChange = useCallback(
    async (assignmentId: string) => {
      if (!assignmentId || assignmentId === activeAssignmentId) return;

      const selected = assignments.find(
        (option) => option.assignmentId === assignmentId,
      );
      if (!selected) return;

      setIsChangingAssignment(true);
      try {
        await setActiveClubContext(assignmentId);
        setActiveClubId(selected.clubId);
        await refresh();
        router.refresh();
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : t("changeFailed");
        toast.error(message);
      } finally {
        setIsChangingAssignment(false);
      }
    },
    [activeAssignmentId, assignments, refresh, router, setActiveClubId],
  );

  const isLoading = authLoading || yearsQuery.isPending;
  const isError = yearsQuery.isError;

  if (isLoading) {
    return <Skeleton className="h-8 w-24 shrink-0 rounded-full sm:w-36" />;
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

  const activeYear =
    years.find((y) => y.ecclesiastical_year_id === activeYearId) ?? null;

  const clubLabel = activeAssignment?.clubName ?? t("noClub");
  const yearLabel = activeYear?.name ?? t("noYear");
  const mobileClubLabel = abbreviateLabel(clubLabel, 12);
  const mobileYearLabel = activeYear?.name
    ? abbreviateYearLabel(activeYear.name)
    : t("noYear");

  function handleClear() {
    if (activeAssignment) {
      setActiveClubId(activeAssignment.clubId);
    } else {
      setActiveClubId(null);
    }
    setActiveYearId(null);
    autoYearSet.current = false;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isChangingAssignment}
          aria-label={t("triggerLabel", { club: clubLabel, year: yearLabel })}
          className="h-8 max-w-[11rem] shrink-0 gap-1 text-xs font-normal text-muted-foreground hover:text-foreground border-border/60 sm:max-w-none sm:gap-1.5"
        >
          <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate sm:hidden" title={clubLabel}>
            {mobileClubLabel}
          </span>
          <span className="hidden truncate max-w-[10rem] md:inline" title={clubLabel}>
            {clubLabel}
          </span>

          <span
            className="mx-0.5 h-3 w-px bg-border shrink-0"
            aria-hidden="true"
          />

          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate sm:hidden" title={yearLabel}>
            {mobileYearLabel}
          </span>
          <span className="hidden truncate max-w-[6rem] md:inline" title={yearLabel}>
            {yearLabel}
          </span>

          <ChevronDown className="size-3 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* ── Club assignments ── */}
        <DropdownMenuLabel>{t("clubLabel")}</DropdownMenuLabel>
        {assignments.length === 0 ? (
          <DropdownMenuItem disabled className="text-sm text-muted-foreground">
            {t("noClub")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuRadioGroup
            value={activeAssignmentId ?? ""}
            onValueChange={handleAssignmentChange}
          >
            {assignments.map((assignment) => (
              <DropdownMenuRadioItem
                key={assignment.assignmentId}
                value={assignment.assignmentId}
                className="text-sm"
                disabled={isChangingAssignment}
              >
                {formatAssignment(assignment)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}

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
