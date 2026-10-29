"use client";

import Link from "next/link";
import { BarChart3, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { MemberRankingScoreBadge } from "@/components/rankings/member-ranking-score-badge";
import type { SectionRankingItem } from "@/lib/api/section-rankings";
import {
  buildSectionMembersHref,
  buildSectionRankingLabel,
} from "@/lib/section-rankings/section-label";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionRankingsTableProps {
  data: SectionRankingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** year_id passed through to the drill-down link query string */
  yearId: number;
  /** Club name to show when the rows do not carry one (e.g. the active club filter). */
  fallbackClubName?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Client component — renders paginated section rankings in a shadcn Table.
 *
 * Columns (6 data + 1 action = 7):
 *   # | Sección | Composite | Miembros activos | Categoría | Calculado | Acción
 *
 * The club name is shown under the section when known: from the row when the
 * backend sends it, otherwise from the active club filter (the backend DTO only
 * carries the club type name today).
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
  fallbackClubName = null,
}: SectionRankingsTableProps) {
  const t = useTranslations("rankings.sectionTable");

  if (data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total === 1 ? t("countSingular", { total }) : t("countPlural", { total })}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 w-14 px-3 text-xs font-medium text-muted-foreground">
                {t("colRank")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("colSection")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("colComposite")}
              </TableHead>
              <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("colActiveMembers")}
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("colCategory")}
              </TableHead>
              <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
                {t("colCalculated")}
              </TableHead>
              <RowActionsHead className="h-9 px-3" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item) => {
              // Note: requires Node.js full-icu support (default in Node 22.x runtime)
              const calculatedAt = item.composite_calculated_at
                ? new Date(item.composite_calculated_at).toLocaleString("es-MX")
                : "—";

              const clubName = item.club_name ?? fallbackClubName;
              const membersHref = buildSectionMembersHref(
                item.club_section_id,
                yearId,
                { sectionName: item.section_name, clubName },
              );
              const rowLabel = buildSectionRankingLabel(
                item.section_name,
                clubName,
                item.section_name,
              );

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
                    <Link
                      href={membersHref}
                      className="block font-medium text-sm leading-none hover:underline"
                    >
                      {item.section_name}
                    </Link>
                    {clubName ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {clubName}
                      </span>
                    ) : null}
                  </TableCell>

                  {/* Composite score */}
                  <TableCell className="px-3 py-2.5 align-middle">
                    <MemberRankingScoreBadge score={item.composite_score_pct} />
                  </TableCell>

                  {/* Active member count */}
                  <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {item.active_enrollment_count}
                  </TableCell>

                  {/* Awarded category (always null for now per backend contract) */}
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {item.awarded_category?.name ?? "—"}
                  </TableCell>

                  {/* Calculated at */}
                  <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {calculatedAt}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="px-3 py-2.5 align-middle">
                    <RowActions
                      label={rowLabel}
                      actions={[{ label: t("viewMembers"), icon: Users, href: membersHref }]}
                    />
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
