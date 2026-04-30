import Link from "next/link";
import { Trophy } from "lucide-react";
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
import { MemberRankingScoreBadge } from "./member-ranking-score-badge";
import type { MemberRankingItem } from "@/lib/api/member-rankings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRankingsTableProps {
  data: MemberRankingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberName(user?: MemberRankingItem["user"]): string {
  if (!user) return "—";
  const parts = [
    user.name ?? user.first_name,
    user.paternal_last_name,
    user.maternal_last_name,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.email ?? "—";
}

function formatScorePct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

function formatInvestitureScore(value: number | null | undefined): string {
  if (value === null) return "—";
  if (value === 100) return "Investido";
  if (value === 0) return "En progreso";
  // Partial scores theoretically possible if backend evolves — fallback semantically
  return "En progreso";
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Pure server component — renders paginated member rankings in a shadcn Table.
 * Pagination is handled by the shared DataTablePagination (client component).
 */
export function MemberRankingsTable({
  data,
  total,
  page,
  limit,
  totalPages,
}: MemberRankingsTableProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Sin rankings disponibles"
        description="Sin rankings para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total}</span>{" "}
        {total === 1 ? "miembro rankeado" : "miembros rankeados"}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 w-14 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                #
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Miembro
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sección
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Composite
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Clase
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Investidura
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Camporees
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Categoría
              </TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Acción
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item) => (
              <TableRow key={item.member_ranking_id} className="hover:bg-muted/30">
                {/* Rank */}
                <TableCell className="px-3 py-2.5 align-middle">
                  <span className="tabular-nums text-sm font-medium text-foreground">
                    #{item.rank_position ?? "—"}
                  </span>
                </TableCell>

                {/* Member */}
                <TableCell className="px-3 py-2.5 align-middle">
                  <div className="space-y-0.5">
                    <p className="font-medium leading-none text-sm">
                      {getMemberName(item.user)}
                    </p>
                    {item.user?.email && (
                      <p className="text-xs text-muted-foreground">
                        {item.user.email}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Section */}
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {item.section?.name ?? "—"}
                </TableCell>

                {/* Composite score */}
                <TableCell className="px-3 py-2.5 align-middle">
                  <MemberRankingScoreBadge score={item.composite_score_pct} />
                </TableCell>

                {/* Class score */}
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                  {formatScorePct(item.class_score_pct)}
                </TableCell>

                {/* Investiture status derived from score */}
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {formatInvestitureScore(item.investiture_score_pct)}
                </TableCell>

                {/* Camporee score */}
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                  {formatScorePct(item.camporee_score_pct)}
                </TableCell>

                {/* Awarded category */}
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {item.awarded_category?.name ?? "—"}
                </TableCell>

                {/* Action */}
                <TableCell className="px-3 py-2.5 align-middle text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/dashboard/member-rankings/${item.enrollment_id}/breakdown`}
                    >
                      Ver detalle
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
