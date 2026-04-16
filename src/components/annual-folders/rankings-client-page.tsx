"use client";

import { useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Medal,
  Trophy,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { ClubRanking, AwardCategory } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

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
        getAwardCategoriesFromClient(selectedClubTypeId, true),
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
          `Rankings recalculados: ${result.rankings_updated} clubes actualizados`,
      );
      setRecalcOpen(false);
      // Reload rankings after recalculation
      await handleSearch();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al recalcular los rankings";
      toast.error(message);
    } finally {
      setIsRecalculating(false);
    }
  }

  // ─── Sorted rankings ──────────────────────────────────────────────────────

  const sortedRankings = [...rankings].sort((a, b) => {
    const posA = a.rank_position ?? Number.MAX_SAFE_INTEGER;
    const posB = b.rank_position ?? Number.MAX_SAFE_INTEGER;
    return posA - posB;
  });

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

        {/* Ano eclesiastico */}
        <div className="flex min-w-44 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Ano eclesiastico
          </span>
          <Select
            value={String(selectedYearId)}
            onValueChange={(val) => setSelectedYearId(Number(val))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar ano" />
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

        {/* Categoria */}
        <div className="flex min-w-44 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Categoria de premio
          </span>
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas las categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorias</SelectItem>
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
            club y ano, luego usa &quot;Recalcular rankings&quot; para generarlos.
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
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Posicion</TableHead>
                <TableHead>Club</TableHead>
                <TableHead className="hidden w-32 text-center md:table-cell">
                  Pts Obtenidos
                </TableHead>
                <TableHead className="hidden w-28 text-center md:table-cell">
                  Pts Maximos
                </TableHead>
                <TableHead className="w-40">Progreso</TableHead>
                <TableHead className="hidden w-32 sm:table-cell">
                  Categoria
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
                        item.rank_position !== null && item.rank_position <= 3
                          ? "font-semibold"
                          : "font-medium"
                      }
                    >
                      {item.club_name}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-center text-sm font-medium md:table-cell">
                    {item.total_earned_points}
                  </TableCell>
                  <TableCell className="hidden text-center text-sm text-muted-foreground md:table-cell">
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
                  <TableCell className="hidden sm:table-cell">
                    {item.award_category_name ? (
                      <Badge variant="outline" className="text-xs">
                        {item.award_category_name}
                      </Badge>
                    ) : (
                      <span className="text-xs italic text-muted-foreground/60">
                        Sin categoria
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Recalculate confirmation */}
      <AlertDialog open={recalcOpen} onOpenChange={setRecalcOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recalcular rankings</AlertDialogTitle>
            <AlertDialogDescription>
              Se recalcularan los rankings para el ano{" "}
              <strong>{activeYear?.name ?? selectedYearId}</strong>. Este proceso
              puede tomar unos segundos. Los resultados anteriores seran
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
              {isRecalculating ? "Recalculando..." : "Confirmar recalculo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
