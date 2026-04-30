import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionRankingsFiltersProps {
  defaultYear?: number;
  defaultClubId?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * GET-form filter bar for the section-rankings list page.
 *
 * Filters: year_id + club_id only.
 * section_id is intentionally omitted — sections ARE the rows, not a filter.
 *
 * TODO: Replace number inputs with catalog-backed <Select> components once
 *       fetch helpers for ecclesiastical years and clubs are available.
 *
 * Submitting the form encodes values as query params (bookmarkable URLs).
 * The reset link navigates to the bare route, clearing all params.
 */
export function SectionRankingsFilters({
  defaultYear,
  defaultClubId,
}: SectionRankingsFiltersProps) {
  return (
    <form className="flex flex-wrap items-end gap-3" method="GET">
      {/* Year filter */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-year" className="text-xs text-muted-foreground">
          Año eclesiástico
        </Label>
        <Input
          id="filter-year"
          name="year_id"
          type="number"
          min={2000}
          max={2100}
          placeholder="2026"
          defaultValue={defaultYear}
          className="h-9 w-32"
        />
      </div>

      {/* Club filter */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-club" className="text-xs text-muted-foreground">
          ID de club
        </Label>
        <Input
          id="filter-club"
          name="club_id"
          type="number"
          min={1}
          placeholder="Todos"
          defaultValue={defaultClubId}
          className="h-9 w-32"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Filtrar
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/section-rankings">Limpiar</Link>
        </Button>
      </div>
    </form>
  );
}
