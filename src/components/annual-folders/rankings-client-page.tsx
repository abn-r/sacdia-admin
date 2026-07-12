"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BarChart3,
  Medal,
  Search,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { usePanelPath } from "@/lib/v2/panel-path-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SortableHeader,
  type SortDirection,
} from "@/components/shared/sortable-header";
import { recalculateRankings } from "@/lib/api/annual-folders";
import {
  listAnnualRankingsFromClient,
  type AnnualRankingComponentProgress,
  type AnnualRankingLeaderboardRow,
} from "@/lib/api/annual-rankings";
import { ApiError } from "@/lib/api/client";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

type SortField =
  | "rank_position"
  | "club_name"
  | "current_points"
  | "progress_percentage"
  | "current_tier";

interface RankingsClientPageProps {
  initialRankings: AnnualRankingLeaderboardRow[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  localFields: LocalField[];
  initialClubTypeId: number;
  initialYearId: number;
  initialLocalFieldId?: number;
}

function formatPoints(value: number): string {
  return value.toLocaleString("es-MX");
}

function RankBadge({ position }: { position: number | null }) {
  if (position === 1) {
    return (
      <span
        title="1er lugar"
        className="inline-flex size-7 items-center justify-center rounded-full bg-warning/15 text-warning-foreground dark:text-warning"
      >
        <Trophy className="size-4" />
      </span>
    );
  }

  if (position === 2) {
    return (
      <span
        title="2do lugar"
        className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Medal className="size-4" />
      </span>
    );
  }

  if (position === 3) {
    return (
      <span
        title="3er lugar"
        className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary"
      >
        <Medal className="size-4" />
      </span>
    );
  }

  return (
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {position ?? "—"}
    </span>
  );
}

function rowHighlight(position: number | null): string {
  if (position === 1) return "bg-warning/10";
  if (position === 2) return "bg-muted/40";
  if (position === 3) return "bg-primary/10";
  return "";
}

function RecognitionBadge({ row }: { row: AnnualRankingLeaderboardRow }) {
  if (!row.current_tier) {
    return (
      <Badge variant="outline" className="whitespace-nowrap">
        Sin rango
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="secondary" className="w-fit whitespace-nowrap">
        {row.current_tier.name}
      </Badge>
      {row.next_tier?.points_to_reach ? (
        <span className="text-xs text-muted-foreground">
          Faltan {formatPoints(row.next_tier.points_to_reach)} pts
        </span>
      ) : null}
    </div>
  );
}

function ComponentSummary({
  components,
}: {
  components: AnnualRankingComponentProgress[];
}) {
  if (components.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin componentes</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {components.slice(0, 3).map((component) => (
        <div key={component.key} className="flex items-center justify-between gap-3">
          <span className="truncate text-xs text-muted-foreground">
            {component.label}
          </span>
          <span className="shrink-0 text-xs font-medium tabular-nums">
            {formatPoints(component.earned_points)}/{formatPoints(component.max_points)}
          </span>
        </div>
      ))}
      {components.length > 3 ? (
        <span className="text-xs text-muted-foreground">
          +{components.length - 3} componentes
        </span>
      ) : null}
    </div>
  );
}

export function RankingsClientPage({
  initialRankings,
  clubTypes,
  ecclesiasticalYears,
  localFields,
  initialClubTypeId,
  initialYearId,
  initialLocalFieldId,
}: RankingsClientPageProps) {
  const t = useTranslations("annual_folders");
  const { toPanelPath } = usePanelPath();
  const [selectedClubTypeId, setSelectedClubTypeId] = useState<number>(
    initialClubTypeId,
  );
  const [selectedYearId, setSelectedYearId] = useState<number>(initialYearId);
  const [selectedLocalFieldId, setSelectedLocalFieldId] = useState<
    number | undefined
  >(initialLocalFieldId ?? localFields[0]?.local_field_id);
  const [rankings, setRankings] =
    useState<AnnualRankingLeaderboardRow[]>(initialRankings);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>("rank_position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const breakdownHref = (enrollmentId: string | number, yearId: number) =>
    toPanelPath(
      `/dashboard/annual-folders/rankings/${enrollmentId}/breakdown?year_id=${yearId}`,
    );

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleSearch = useCallback(async () => {
    if (selectedLocalFieldId === undefined) {
      toast.error("Seleccioná un campo local para consultar el ranking");
      return;
    }

    setIsLoading(true);
    try {
      const newRankings = await listAnnualRankingsFromClient({
        clubTypeId: selectedClubTypeId,
        ecclesiasticalYearId: selectedYearId,
        localFieldId: selectedLocalFieldId,
      });
      setRankings(Array.isArray(newRankings) ? newRankings : []);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los rankings";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClubTypeId, selectedLocalFieldId, selectedYearId]);

  async function confirmRecalculate() {
    setIsRecalculating(true);
    try {
      const result = await recalculateRankings(selectedYearId);
      toast.success(
        result.message ??
          t("toasts.rankings_recalculated", { count: result.rankings_updated }),
      );
      setRecalcOpen(false);
      await handleSearch();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t("errors.recalculate_rankings");
      toast.error(message);
    } finally {
      setIsRecalculating(false);
    }
  }

  const activeYear = ecclesiasticalYears.find(
    (year) => year.ecclesiastical_year_id === selectedYearId,
  );
  const activeLocalField = localFields.find(
    (field) => field.local_field_id === selectedLocalFieldId,
  );
  const activeClubType = clubTypes.find(
    (type) => type.club_type_id === selectedClubTypeId,
  );

  const sortedRankings = useMemo(() => {
    return [...rankings].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;

      switch (sortField) {
        case "rank_position":
          return (a.rank_position - b.rank_position) * dir;
        case "club_name":
          return a.club_name.localeCompare(b.club_name) * dir;
        case "current_points":
          return (a.current_points - b.current_points) * dir;
        case "progress_percentage":
          return (a.progress_percentage - b.progress_percentage) * dir;
        case "current_tier":
          return (
            (a.current_tier?.name ?? "").localeCompare(
              b.current_tier?.name ?? "",
            ) * dir
          );
        default:
          return 0;
      }
    });
  }, [rankings, sortDirection, sortField]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-40 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Tipo de club
          </span>
          <Select
            value={String(selectedClubTypeId)}
            onValueChange={(value) => setSelectedClubTypeId(Number(value))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tipo de club" />
            </SelectTrigger>
            <SelectContent>
              {clubTypes.map((clubType) => (
                <SelectItem
                  key={clubType.club_type_id}
                  value={String(clubType.club_type_id)}
                >
                  {clubType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {localFields.length > 0 && selectedLocalFieldId !== undefined && (
          <div className="flex min-w-48 flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Campo local
            </span>
            <Select
              value={String(selectedLocalFieldId)}
              onValueChange={(value) => setSelectedLocalFieldId(Number(value))}
              disabled={localFields.length <= 1}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar campo local" />
              </SelectTrigger>
              <SelectContent>
                {localFields.map((field) => (
                  <SelectItem
                    key={field.local_field_id}
                    value={String(field.local_field_id)}
                  >
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex min-w-44 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Año eclesiástico
          </span>
          <Select
            value={String(selectedYearId)}
            onValueChange={(value) => setSelectedYearId(Number(value))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar año" />
            </SelectTrigger>
            <SelectContent>
              {ecclesiasticalYears.map((year) => (
                <SelectItem
                  key={year.ecclesiastical_year_id}
                  value={String(year.ecclesiastical_year_id)}
                >
                  {year.name}
                  {year.active && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (activo)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={handleSearch}
          disabled={isLoading}
          className="h-9"
        >
          <Search className="size-4" />
          {isLoading ? t("rankingsClientPage.searchLoading") : t("rankingsClientPage.searchButton")}
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setRecalcOpen(true)}
          disabled={isLoading || isRecalculating}
        >
          <TrendingUp className="size-4" />
          Recalcular rankings
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <BarChart3 className="size-4" />
        <span>
          <span className="font-medium text-foreground">{rankings.length}</span>{" "}
          {rankings.length === 1 ? "club" : "clubes"} en el ranking
        </span>
        {activeClubType && (
          <>
            <span aria-hidden>·</span>
            <span>{activeClubType.name}</span>
          </>
        )}
        {activeYear && (
          <>
            <span aria-hidden>·</span>
            <span>{activeYear.name}</span>
          </>
        )}
        {activeLocalField && (
          <>
            <span aria-hidden>·</span>
            <span>{activeLocalField.name}</span>
          </>
        )}
      </div>

      {sortedRankings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">
            No hay rankings calculados
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            No hay datos para estos filtros. Revisá que exista configuración anual
            de puntos y que el ranking base haya sido calculado.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setRecalcOpen(true)}
          >
            <TrendingUp className="size-4" />
            Recalcular rankings
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden rounded-lg border border-border/60 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 w-16 px-3 text-center">
                    <SortableHeader
                      field="rank_position"
                      activeField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Posición
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="h-9 px-3">
                    <SortableHeader
                      field="club_name"
                      activeField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Club
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="h-9 w-36 px-3 text-center">
                    Tipo
                  </TableHead>
                  <TableHead className="h-9 w-36 px-3 text-right">
                    <SortableHeader
                      field="current_points"
                      activeField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                      align="right"
                    >
                      Puntos
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="h-9 w-40 px-3">
                    <SortableHeader
                      field="progress_percentage"
                      activeField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Progreso
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="h-9 w-36 px-3">
                    <SortableHeader
                      field="current_tier"
                      activeField={sortField}
                      direction={sortDirection}
                      onSort={handleSort}
                    >
                      Rango
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="h-9 min-w-56 px-3">
                    Componentes
                  </TableHead>
                  <TableHead className="h-9 w-24 px-3 text-center">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRankings.map((item) => (
                  <TableRow
                    key={item.club_enrollment_id}
                    className={rowHighlight(item.rank_position)}
                  >
                    <TableCell className="text-center">
                      <RankBadge position={item.rank_position} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          item.rank_position <= 3 ? "font-semibold" : "font-medium"
                        }
                      >
                        {item.club_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {activeClubType?.name ?? item.club_type_id}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatPoints(item.current_points)}
                      <span className="text-muted-foreground">
                        /{formatPoints(item.max_points)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(item.progress_percentage, 100)}
                          className="h-2 flex-1"
                        />
                        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {item.progress_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RecognitionBadge row={item} />
                    </TableCell>
                    <TableCell>
                      <ComponentSummary components={item.components} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Link prefetch={false}
                        href={breakdownHref(
                          item.club_enrollment_id,
                          item.ecclesiastical_year_id ?? selectedYearId,
                        )}
                        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                      >
                        Ver detalle
                        <ArrowRight className="size-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden" aria-label="Rankings de clubes">
            {sortedRankings.map((item) => (
              <li key={item.club_enrollment_id}>
                <div
                  className={`rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40${
                    item.rank_position === 1
                      ? " bg-warning/10"
                      : item.rank_position === 2
                        ? " bg-muted/40"
                        : item.rank_position === 3
                          ? " bg-primary/10"
                          : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RankBadge position={item.rank_position} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate ${
                          item.rank_position <= 3 ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {item.club_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activeClubType?.name ?? item.club_type_id}
                      </p>
                    </div>
                    <RecognitionBadge row={item} />
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Puntos</span>
                      <span className="font-medium tabular-nums">
                        {formatPoints(item.current_points)}/{formatPoints(item.max_points)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress
                        value={Math.min(item.progress_percentage, 100)}
                        className="h-2 flex-1"
                      />
                      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {item.progress_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-muted/40 p-3">
                    <ComponentSummary components={item.components} />
                  </div>

                  <div className="mt-3 border-t pt-3">
                    <Link prefetch={false}
                      href={breakdownHref(
                        item.club_enrollment_id,
                        item.ecclesiastical_year_id ?? selectedYearId,
                      )}
                      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Ver detalle
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <AlertDialog open={recalcOpen} onOpenChange={setRecalcOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dialogs.recalculateRankings.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.recalculateRankings.description", {
                year: activeYear?.name ?? selectedYearId ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRecalculating}>
              {t("dialogs.recalculateRankings.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRecalculate}
              disabled={isRecalculating}
            >
              {isRecalculating
                ? t("dialogs.recalculateRankings.confirmLoading")
                : t("dialogs.recalculateRankings.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
