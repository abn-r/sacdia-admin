import Link from "next/link";
import { BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { MemberRankingScoreBadge } from "@/app/(dashboard)/dashboard/member-rankings/_components/member-ranking-score-badge";
import type { SectionRankingItem } from "@/lib/api/section-rankings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionRankingsTableProps {
  data: SectionRankingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** year_id passed through to the drill-down link query string */
  yearId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Pure server component — renders paginated section rankings in a shadcn Table.
 *
 * Columns (6 data + 1 action = 7):
 *   # | Sección | Composite | Miembros activos | Categoría | Calculado | Acción
 *
 * NOTE: `club_name` is NOT included because `SectionRankingResponseDto` does not
 * carry a `club` relation at the section level. The club filter on the list page
 * is sufficient context. If the backend adds a `club` relation to the DTO in
 * future, add a "Club" column here.
 *
 * Pagination is handled by the shared DataTablePagination (client component).
 */
export function SectionRankingsTable({
  data,
  total,
  page,
  limit,
  totalPages,
  yearId,
}: SectionRankingsTableProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sin rankings disponibles"
        description="Sin rankings para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total}</span>{" "}
        {total === 1 ? "sección rankeada" : "secciones rankeadas"}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 w-14 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                #
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sección
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Composite
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Miembros activos
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Categoría
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Calculado
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Acción
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item) => {
              const calculatedAt = item.composite_calculated_at
                ? new Date(item.composite_calculated_at).toLocaleString("es-MX")
                : "—";

              return (
                <TableRow
                  key={item.club_section_id}
                  className="hover:bg-muted/30"
                >
                  {/* Rank */}
                  <TableCell className="px-3 py-2.5 align-middle">
                    <span className="tabular-nums text-sm font-medium text-foreground">
                      {item.rank_position !== null
                        ? `#${item.rank_position}`
                        : "—"}
                    </span>
                  </TableCell>

                  {/* Section name */}
                  <TableCell className="px-3 py-2.5 align-middle">
                    <p className="font-medium text-sm leading-none">
                      {item.section_name}
                    </p>
                  </TableCell>

                  {/* Composite score */}
                  <TableCell className="px-3 py-2.5 align-middle">
                    <MemberRankingScoreBadge score={item.composite_score_pct} />
                  </TableCell>

                  {/* Active member count */}
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {item.active_enrollment_count}
                  </TableCell>

                  {/* Awarded category (always null for now per backend contract) */}
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {item.awarded_category?.name ?? "—"}
                  </TableCell>

                  {/* Calculated at */}
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {calculatedAt}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="px-3 py-2.5 align-middle text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/dashboard/section-rankings/${item.club_section_id}/members?year_id=${yearId}`}
                      >
                        Ver miembros
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
      />
    </div>
  );
}
