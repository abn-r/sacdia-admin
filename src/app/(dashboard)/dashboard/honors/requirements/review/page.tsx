"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCheck,
  ClipboardList,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ReviewSplitView,
  type ReviewAction,
} from "@/components/honors/review-split-view";
import {
  batchReview,
  getHonorById,
  getPendingReview,
  listHonorCategories,
  listHonors,
  type Honor,
  type HonorCategory,
  type PaginatedResponse,
  type ReviewFilters,
  type ReviewRequirement,
} from "@/lib/api/honors";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = "list" | "split";
type PageStatus = "loading" | "error" | "ready";

const LIMIT_OPTIONS = [10, 20, 50] as const;
const DEFAULT_LIMIT = 20;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  const v = value as Record<string, unknown> | null | undefined;
  if (v && Array.isArray(v.data)) return v.data as T[];
  return [];
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  // ── View state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [splitIndex, setSplitIndex] = useState<number>(0);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedResponse<ReviewRequirement> | null>(
    null,
  );

  // ── Filter & pagination state ───────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [filterHonorId, setFilterHonorId] = useState<number | undefined>();
  const [filterCategoryId, setFilterCategoryId] = useState<
    number | undefined
  >();

  // ── Filter options ──────────────────────────────────────────────────────────
  const [honors, setHonors] = useState<Honor[]>([]);
  const [categories, setCategories] = useState<HonorCategory[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // ── Honor material cache (for split view) ───────────────────────────────────
  const [honorMaterialCache, setHonorMaterialCache] = useState<
    Map<number, string | null>
  >(new Map());

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    setSelectedIds(new Set());

    const filters: ReviewFilters = {};
    if (filterHonorId !== undefined) filters.honorId = filterHonorId;
    if (filterCategoryId !== undefined) filters.categoryId = filterCategoryId;

    try {
      const result = (await getPendingReview(
        page,
        limit,
        filters,
      )) as PaginatedResponse<ReviewRequirement>;
      setData(result);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los requisitos pendientes.",
      );
      setStatus("error");
    }
  }, [page, limit, filterHonorId, filterCategoryId]);

  const loadFilters = useCallback(async () => {
    if (filtersLoaded) return;
    try {
      const [honorsResult, categoriesResult] = await Promise.all([
        listHonors({ limit: 200 }),
        listHonorCategories(),
      ]);
      setHonors(normalizeArray<Honor>(honorsResult));
      setCategories(normalizeArray<HonorCategory>(categoriesResult));
    } catch {
      // Non-fatal: filters remain empty
    } finally {
      setFiltersLoaded(true);
    }
  }, [filtersLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  // ─── Material URL loader for split view ────────────────────────────────────

  useEffect(() => {
    if (viewMode !== "split" || !data) return;

    const req = data.data[splitIndex];
    if (!req) return;

    const honorId = req.honor_id;
    if (honorMaterialCache.has(honorId)) return;

    void (async () => {
      try {
        const honor = (await getHonorById(honorId)) as Honor;
        setHonorMaterialCache((prev) =>
          new Map(prev).set(honorId, honor.material_url ?? null),
        );
      } catch {
        setHonorMaterialCache((prev) => new Map(prev).set(honorId, null));
      }
    })();
  }, [viewMode, splitIndex, data, honorMaterialCache]);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const allOnPageSelected =
    items.length > 0 && items.every((r) => selectedIds.has(r.requirement_id));
  const someSelected = selectedIds.size > 0;

  const currentRequirement = viewMode === "split" ? items[splitIndex] : null;
  const splitMaterialUrl =
    currentRequirement !== null && currentRequirement !== undefined
      ? (honorMaterialCache.get(currentRequirement.honor_id) ?? null)
      : null;

  const splitPositionLabel = useMemo(() => {
    if (!currentRequirement) return "";
    const globalIndex = (page - 1) * limit + splitIndex + 1;
    return `${globalIndex} de ${total}`;
  }, [currentRequirement, page, limit, splitIndex, total]);

  // ─── Selection handlers ─────────────────────────────────────────────────────

  function toggleItem(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((r) => r.requirement_id)));
    }
  }

  // ─── Batch actions ──────────────────────────────────────────────────────────

  async function handleBatch(approved: boolean) {
    if (!someSelected) return;
    setBatchLoading(true);
    try {
      await batchReview([...selectedIds], approved);
      setSelectedIds(new Set());
      await load();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error en la operación masiva.",
      );
    } finally {
      setBatchLoading(false);
    }
  }

  // ─── Split view navigation ──────────────────────────────────────────────────

  function openSplit(index: number) {
    setSplitIndex(index);
    setViewMode("split");
  }

  function closeSplit() {
    setViewMode("list");
  }

  function handleSplitNavigate(direction: "prev" | "next") {
    if (direction === "prev" && splitIndex > 0) {
      setSplitIndex(splitIndex - 1);
    } else if (direction === "next" && splitIndex < items.length - 1) {
      setSplitIndex(splitIndex + 1);
    }
  }

  function handleSplitAction(action: ReviewAction) {
    // After any action, remove the item from the local list and move forward
    const remainingCount = items.length - 1;

    setData((prev) => {
      if (!prev) return prev;
      const remaining = prev.data.filter(
        (r) => r.requirement_id !== action.requirementId,
      );
      const newTotal = Math.max(0, prev.total - 1);
      return { ...prev, data: remaining, total: newTotal };
    });

    if (remainingCount === 0) {
      setViewMode("list");
      setSplitIndex(0);
    } else {
      setSplitIndex((prev) => Math.min(prev, remainingCount - 1));
    }
  }

  // ─── Filter handlers ────────────────────────────────────────────────────────

  function handleHonorFilter(value: string) {
    setFilterHonorId(value === "all" ? undefined : Number(value));
    setPage(1);
  }

  function handleCategoryFilter(value: string) {
    setFilterCategoryId(value === "all" ? undefined : Number(value));
    setPage(1);
  }

  function handleLimitChange(value: string) {
    setLimit(Number(value));
    setPage(1);
  }

  // ─── Split view render ──────────────────────────────────────────────────────

  if (viewMode === "split" && currentRequirement) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col space-y-4">
        {/* Back + header row */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={closeSplit}>
            <ArrowLeft className="mr-2 size-4" />
            Volver a la lista
          </Button>
          <div className="flex-1">
            <PageHeader
              title="Revisión de requisito"
              description={currentRequirement.honors.name}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ReviewSplitView
            requirement={currentRequirement}
            materialUrl={splitMaterialUrl}
            onAction={handleSplitAction}
            onNavigate={handleSplitNavigate}
            hasPrev={splitIndex > 0}
            hasNext={splitIndex < items.length - 1}
            positionLabel={splitPositionLabel}
          />
        </div>
      </div>
    );
  }

  // ─── List view render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Revisión de Requisitos"
        description="Revisá y aprobá los requisitos importados que necesitan validación."
      >
        <Badge variant="warning" className="tabular-nums">
          {status === "ready" ? total : "–"} pendientes
        </Badge>
      </PageHeader>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filterHonorId !== undefined ? String(filterHonorId) : "all"}
          onValueChange={handleHonorFilter}
        >
          <SelectTrigger className="h-8 w-[200px]">
            <SelectValue placeholder="Todas las especialidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las especialidades</SelectItem>
            {honors.map((h) => (
              <SelectItem key={h.honor_id} value={String(h.honor_id)}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            filterCategoryId !== undefined ? String(filterCategoryId) : "all"
          }
          onValueChange={handleCategoryFilter}
        >
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => {
              const id = c.honor_category_id ?? c.category_id;
              if (id === undefined) return null;
              return (
                <SelectItem key={id} value={String(id)}>
                  {c.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Batch action buttons */}
        {someSelected && (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} seleccionado
              {selectedIds.size !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              onClick={() => void handleBatch(true)}
              disabled={batchLoading}
            >
              {batchLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              Aprobar seleccionados
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void handleBatch(false)}
              disabled={batchLoading}
            >
              {batchLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Rechazar seleccionados
            </Button>
          </>
        )}
      </div>

      {/* Loading */}
      {status === "loading" && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">
              No se pudo cargar la información
            </p>
            <p className="text-sm text-destructive/80">
              {errorMessage ?? "Error desconocido."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void load()}
            >
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {status === "ready" && items.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="Sin requisitos pendientes"
          description="No hay requisitos esperando revisión en este momento."
        />
      )}

      {/* Table */}
      {status === "ready" && items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-4">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Especialidad
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Etiqueta
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Texto del requisito
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((req, index) => (
                  <TableRow
                    key={req.requirement_id}
                    data-selected={selectedIds.has(req.requirement_id)}
                    className="cursor-pointer hover:bg-muted/50 data-[selected=true]:bg-primary/5"
                    onClick={() => openSplit(index)}
                  >
                    <TableCell
                      className="px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(req.requirement_id)}
                        onCheckedChange={() => toggleItem(req.requirement_id)}
                        aria-label={`Seleccionar requisito ${req.requirement_id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {req.honors.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      {req.requirement_number ? (
                        <Badge variant="outline">
                          #{req.requirement_number}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="max-w-md truncate text-sm text-muted-foreground">
                        {truncate(req.requirement_text)}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openSplit(index)}
                      >
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Mostrando{" "}
              {Math.min((page - 1) * limit + 1, total)}–
              {Math.min(page * limit, total)} de {total} requisitos
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Por página</span>
                <Select
                  value={String(limit)}
                  onValueChange={handleLimitChange}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIMIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Página anterior"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Página siguiente"
                >
                  <ArrowLeft className="size-4 rotate-180" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
