"use client";

import { useId } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export type StatusFilter = "all" | "active" | "inactive";

export interface CatalogFilterBarProps {
  /** Entity name for contextual placeholder, e.g. "especialidades" */
  entityLabel: string;
  /** Controlled search value */
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Controlled status filter */
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  /** Total records (unfiltered) */
  totalCount: number;
  /** Filtered record count — when equal to totalCount, no filter badge is shown */
  filteredCount: number;
  /** Called when the user clicks "Limpiar filtros" */
  onClearFilters: () => void;
  /**
   * Optional slot for domain-specific filters (date pickers, club selector, etc.)
   * Rendered inline between the status select and the results count.
   */
  extraFilters?: React.ReactNode;
  className?: string;
}

// ─── ActiveChip ─────────────────────────────────────────────────────────────

interface ActiveChipProps {
  label: string;
  onRemove: () => void;
}

function ActiveChip({ label, onRemove }: ActiveChipProps) {
  return (
    <Badge
      variant="secondary"
      className="inline-flex h-6 items-center gap-1 pl-2 pr-1 text-xs font-medium"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro: ${label}`}
        className="ml-0.5 flex size-4 items-center justify-center rounded-sm opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </Badge>
  );
}

// ─── ResultsCount ────────────────────────────────────────────────────────────

interface ResultsCountProps {
  filteredCount: number;
  totalCount: number;
  isFiltered: boolean;
}

function ResultsCount({ filteredCount, totalCount, isFiltered }: ResultsCountProps) {
  return (
    <span
      className="shrink-0 text-[13px] tabular-nums text-muted-foreground"
      aria-live="polite"
      aria-atomic="true"
    >
      {isFiltered ? (
        <>
          <span className="font-medium text-foreground">{filteredCount}</span>
          {" de "}
          <span className="font-medium text-foreground">{totalCount}</span>
          {" registros"}
        </>
      ) : (
        <>
          <span className="font-medium text-foreground">{totalCount}</span>
          {` ${totalCount === 1 ? "registro" : "registros"}`}
        </>
      )}
    </span>
  );
}

// ─── CatalogFilterBar ────────────────────────────────────────────────────────

export function CatalogFilterBar({
  entityLabel,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  filteredCount,
  onClearFilters,
  extraFilters,
  className,
}: CatalogFilterBarProps) {
  const searchId = useId();
  const statusId = useId();

  const isSearchActive = searchValue.trim() !== "";
  const isStatusActive = statusFilter !== "all";
  const isFiltered = isSearchActive || isStatusActive;

  const statusLabel: Record<StatusFilter, string> = {
    all: "Todos los estados",
    active: "Activos",
    inactive: "Inactivos",
  };

  return (
    <div
      className={cn("space-y-3", className)}
      role="search"
      aria-label={`Filtros de ${entityLabel}`}
    >
      {/* ── Primary control row ── */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center">

        {/* Search input */}
        <div className="relative flex-1 md:max-w-md">
          <Label htmlFor={searchId} className="sr-only">
            Buscar en {entityLabel}
          </Label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            placeholder={`Buscar en ${entityLabel}...`}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 bg-background pl-9 pr-20"
            aria-describedby={isFiltered ? `${searchId}-status` : undefined}
          />
          {/* ⌘K keyboard hint */}
          <kbd
            className="pointer-events-none absolute right-2 top-1/2 hidden h-6 -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground md:inline-flex"
            aria-hidden="true"
          >
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </div>

        {/* Status filter */}
        <div className="w-full md:w-[188px]">
          <Label htmlFor={statusId} className="sr-only">
            Filtrar por estado
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
          >
            <SelectTrigger
              id={statusId}
              className="h-10 w-full"
              aria-label="Filtrar por estado"
            >
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <SelectValue placeholder="Estado" />
                {isStatusActive && (
                  <Badge
                    variant="soft"
                    className="ml-auto h-4 px-1 text-[10px] font-semibold"
                    aria-label="Filtro activo"
                  >
                    1
                  </Badge>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Extra domain filters slot */}
        {extraFilters}

        {/* Results count — pushed to the right on md+ */}
        <div className="flex shrink-0 items-center gap-3 md:ml-auto">
          <ResultsCount
            filteredCount={filteredCount}
            totalCount={totalCount}
            isFiltered={isFiltered}
          />
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Limpiar todos los filtros activos"
            >
              <X className="size-3" aria-hidden="true" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* ── Active filter chips row ── */}
      {isFiltered && (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filtros activos"
          id={`${searchId}-status`}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Filtros:
          </span>
          {isSearchActive && (
            <ActiveChip
              label={`Búsqueda: "${searchValue.trim()}"`}
              onRemove={() => onSearchChange("")}
            />
          )}
          {isStatusActive && (
            <ActiveChip
              label={statusLabel[statusFilter]}
              onRemove={() => onStatusFilterChange("all")}
            />
          )}
        </div>
      )}
    </div>
  );
}
