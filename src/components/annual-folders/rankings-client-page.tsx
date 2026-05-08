"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Medal,
  Trophy,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RankingScoreBadge } from "@/components/rankings/ranking-score-badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import {
  getRankingsFromClient,
  getAwardCategoriesFromClient,
  recalculateRankings,
} from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import {
  SortableHeader,
  type SortDirection,
} from "@/components/shared/sortable-header";
import type { ClubRanking, AwardCategory } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortField =
  | "rank_position"
  | "club_name"
  | "composite_score_pct"
  | "total_earned_points"
  | "progress_percentage";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RankingsClientPageProps {
  initialRankings: ClubRanking[];
  initialCategories: AwardCategory[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  initialClubTypeId: number;
  initialYearId: number;
}

// ─── Medal icon helper ─────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export function RankingsClientPage({
  initialRankings,
  initialCategories,
  clubTypes,
  ecclesiasticalYears,
  initialClubTypeId,
  initialYearId,
}: RankingsClientPageProps) {
  const t = useTranslations("annual_folders");
  // Filter state
  const [selectedClubTypeId, setSelectedClubTypeId] = useState<number>(
    initialClubTypeId,
  );
  const [selectedYearId, setSelectedYearId] = useState<number>(initialYearId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  // Data state
  const [rankings, setRankings] = useState<ClubRanking[]>(initialRankings);
  const [categories, setCategories] =
    useState<AwardCategory[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("rank_position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Recalculate dialog
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // ─── Filter categories when club type changes ──────────────────────────────

  const filteredCategories = categories.filter(
    (c) =>
      c.active &&
      (c.club_type_id === null || c.club_type_id === selectedClubTypeId),
  );

  // ─── Search ───────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const [newRankings, newCategories] = await Promise.all([
        getRankingsFromClient(
          selectedClubTypeId,
          selectedYearId,
          selectedCategoryId !== "all" ? selectedCategoryId : undefined,
        ),
        getAwardCategoriesFromClient(selectedClubTypeId, true, "club", false),
      ]);
      setRankings(Array.isArray(newRankings) ? newRankings : []);
      setCategories(Array.isArray(newCategories) ? newCategories : []);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los rankings";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClubTypeId, selectedYearId, selectedCategoryId]);

  // ─── Recalculate ──────────────────────────────────────────────────────────

  async function confirmRecalculate() {
    setIsRecalculating(true);
    try {
      const result = await recalculateRankings(selectedYearId);
      toast.success(
        result.message ??
          t("toasts.rankings_recalculated", { count: result.rankings_updated }),
      );
      setRecalcOpen(false);
      // Reload rankings after recalculation
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

  // ─── Sorted rankings ──────────────────────────────────────────────────────

  const sortedRankings = useMemo(() => {
    return [...rankings].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "rank_position": {
          const posA = a.rank_position ?? Number.MAX_SAFE_INTEGER;
          const posB = b.rank_position ?? Number.MAX_SAFE_INTEGER;
          return (posA - posB) * dir;
        }
        case "club_name":
          return a.club_name.localeCompare(b.club_name) * dir;
        case "composite_score_pct":
          return (a.composite_score_pct - b.composite_score_pct) * dir;
        case "total_earned_points":
          return (a.total_earned_points - b.total_earned_points) * dir;
        case "progress_percentage":
          return (a.progress_percentage - b.progress_percentage) * dir;
        default:
          return 0;
      }
    });
  }, [rankings, sortField, sortDirection]);

  const activeYear = ecclesiasticalYears.find(
    (y) => y.ecclesiastical_year_id === selectedYearId,
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Filters bar */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Tipo de club */}
        <div className="flex min-w-40 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Tipo de club
          </span>
          <Select
            value={String(selectedClubTypeId)}
            onValueChange={(val) => {
              setSelectedClubTypeId(Number(val));
              setSelectedCategoryId("all");
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tipo de club" />
            </SelectTrigger>
            <SelectContent>
              {clubTypes.map((ct) => (
                <SelectItem
                  key={ct.club_type_id}
                  value={String(ct.club_type_id)}
                >
                  {ct.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Año eclesiástico */}
        <div className="flex min-w-44 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Año eclesiástico
          </span>
          <Select
            value={String(selectedYearId)}
            onValueChange={(val) => setSelectedYearId(Number(val))}
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

        {/* Categoría */}
        <div className="flex min-w-44 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Categoría de premio
          </span>
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {filteredCategories.map((cat) => (
                <SelectItem
                  key={cat.award_category_id}
                  value={cat.award_category_id}
                >
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Buscar button */}
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={isLoading}
          className="h-9"
        >
          <Search className="size-4" />
          {isLoading ? "Buscando..." : "Buscar"}
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Recalculate */}
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

      {/* Summary bar */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <BarChart3 className="size-4" />
        <span>
          <span className="font-medium text-foreground">{rankings.length}</span>{" "}
          {rankings.length === 1 ? "club" : "clubes"} en el ranking
        </span>
        {activeYear && (
          <>
            <span aria-hidden>·</span>
            <span>{activeYear.name}</span>
          </>
        )}
      </div>

      {/* Rankings table */}
      {sortedRankings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">
            No hay rankings calculados
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            No hay rankings calculados para estos filtros. Selecciona un tipo de
            club y año, luego usa &quot;Recalcular rankings&quot; para generarlos.
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
          {/* Desktop: rankings table */}
          <div className="hidden rounded-lg border border-border/60 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="h-9 w-16 px-3 text-center"
                    aria-sort={sortField === "rank_position" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortableHeader field="rank_position" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                      Posición
                    </SortableHeader>
                  </TableHead>
                  <TableHead
                    className="h-9 px-3"
                    aria-sort={sortField === "club_name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortableHeader field="club_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                      Club
                    </SortableHeader>
                  </TableHead>
                  <TableHead
                    className="h-9 w-28 px-3 text-center"
                    aria-sort={sortField === "composite_score_pct" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortableHeader field="composite_score_pct" activeField={sortField} direction={sortDirection} onSort={handleSort} align="right">
                      Composite
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="hidden h-9 w-24 px-3 text-center lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Carpeta
                  </TableHead>
                  <TableHead className="hidden h-9 w-24 px-3 text-center lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Finanzas
                  </TableHead>
                  <TableHead className="hidden h-9 w-24 px-3 text-center lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Camporees
                  </TableHead>
                  <TableHead className="hidden h-9 w-24 px-3 text-center lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Evidencias
                  </TableHead>
                  <TableHead
                    className="h-9 w-32 px-3 text-center"
                    aria-sort={sortField === "total_earned_points" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortableHeader field="total_earned_points" activeField={sortField} direction={sortDirection} onSort={handleSort} align="right">
                      Pts Obtenidos
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="hidden h-9 w-28 px-3 text-center lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Pts Maximos
                  </TableHead>
                  <TableHead
                    className="h-9 w-40 px-3"
                    aria-sort={sortField === "progress_percentage" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortableHeader field="progress_percentage" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                      Progreso
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="hidden h-9 w-32 px-3 lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Categoría
                  </TableHead>
                  <TableHead className="h-9 w-24 px-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Acciones</TableHead>
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
                          item.rank_position !== null && item.rank_position <= 3
                            ? "font-semibold"
                            : "font-medium"
                        }
                      >
                        {item.club_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <RankingScoreBadge value={item.composite_score_pct} />
                    </TableCell>
                    <TableCell className="hidden text-center text-sm tabular-nums text-muted-foreground lg:table-cell">
                      {item.folder_score_pct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="hidden text-center text-sm tabular-nums text-muted-foreground lg:table-cell">
                      {item.finance_score_pct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="hidden text-center text-sm tabular-nums text-muted-foreground lg:table-cell">
                      {item.camporee_score_pct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="hidden text-center text-sm tabular-nums text-muted-foreground lg:table-cell">
                      {item.evidence_score_pct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {item.total_earned_points}
                    </TableCell>
                    <TableCell className="hidden text-center text-sm text-muted-foreground lg:table-cell">
                      {item.total_max_points}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(item.progress_percentage, 100)}
                          className="h-2 flex-1"
                        />
                        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {item.progress_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {item.award_category_name ? (
                        <Badge variant="outline" className="text-xs">
                          {item.award_category_name}
                        </Badge>
                      ) : (
                        <span className="text-xs italic text-muted-foreground/60">
                          Sin categoría
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link
                        href={`/dashboard/annual-folders/rankings/${item.club_enrollment_id}/breakdown?year_id=${item.ecclesiastical_year_id ?? selectedYearId}`}
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

          {/* Mobile: ranking cards */}
          <ul className="space-y-3 md:hidden" aria-label="Rankings de clubes">
            {sortedRankings.map((item) => (
              <li key={item.club_enrollment_id}>
                <div
                  className={`rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none${item.rank_position === 1 ? " bg-warning/10" : item.rank_position === 2 ? " bg-muted/40" : item.rank_position === 3 ? " bg-primary/10" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <RankBadge position={item.rank_position} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate ${item.rank_position !== null && item.rank_position <= 3 ? "font-semibold" : "font-medium"}`}
                      >
                        {item.club_name}
                      </p>
                      {item.award_category_name && (
                        <p className="mt-0.5">
                          <Badge variant="outline" className="text-xs">
                            {item.award_category_name}
                          </Badge>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <RankingScoreBadge value={item.composite_score_pct} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(item.progress_percentage, 100)}
                        className="h-2 flex-1"
                      />
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {item.progress_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Pts obtenidos</dt>
                      <dd className="font-medium tabular-nums">{item.total_earned_points}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Pts máximos</dt>
                      <dd className="tabular-nums text-muted-foreground">{item.total_max_points}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Carpeta</dt>
                      <dd className="tabular-nums">{item.folder_score_pct.toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Finanzas</dt>
                      <dd className="tabular-nums">{item.finance_score_pct.toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Camporees</dt>
                      <dd className="tabular-nums">{item.camporee_score_pct.toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Evidencias</dt>
                      <dd className="tabular-nums">{item.evidence_score_pct.toFixed(1)}%</dd>
                    </div>
                  </dl>

                  <div className="mt-3 border-t pt-3">
                    <Link
                      href={`/dashboard/annual-folders/rankings/${item.club_enrollment_id}/breakdown?year_id=${item.ecclesiastical_year_id ?? selectedYearId}`}
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

      {/* Recalculate confirmation */}
      <AlertDialog open={recalcOpen} onOpenChange={setRecalcOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recalcular rankings</AlertDialogTitle>
            <AlertDialogDescription>
              Se recalcularán los rankings para el año{" "}
              <strong>{activeYear?.name ?? selectedYearId}</strong>. Este proceso
              puede tomar unos segundos. Los resultados anteriores serán
              reemplazados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRecalculating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRecalculate}
              disabled={isRecalculating}
            >
              {isRecalculating ? "Recalculando..." : "Confirmar recálculo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
