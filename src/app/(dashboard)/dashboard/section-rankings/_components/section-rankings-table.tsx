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
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { useFormatDateTime } from "@/lib/format-locale";
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
  const formatDateTime = useFormatDateTime();

  if (data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  const maxScore = data.reduce(
    (max, item) => Math.max(max, item.composite_score_pct ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total === 1 ? t("countSingular", { total }) : t("countPlural", { total })}
      </p>

      <DataTableShell>
        <Table className="max-md:block">
          <TableHeader className="max-md:sr-only">
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

          <TableBody className="max-md:block">
            {data.map((item) => {
              const calculatedAt = item.composite_calculated_at
                ? formatDateTime(item.composite_calculated_at)
                : "—";
              const scoreRatio =
                item.composite_score_pct !== null && maxScore > 0
                  ? Math.min(1, Math.max(0, item.composite_score_pct / maxScore))
                  : 0;

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
                  className="hover:bg-muted/30 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1 max-md:px-4 max-md:py-3"
                >
                  {/* Rank */}
                  <TableCell className="px-3 py-2.5 align-middle max-md:order-1 max-md:p-0">
                    <span className="tabular-nums text-sm font-medium text-foreground">
                      {item.rank_position !== null
                        ? `#${item.rank_position}`
                        : "—"}
                    </span>
                  </TableCell>

                  {/* Section name */}
                  <TableCell className="px-3 py-2.5 align-middle max-md:order-2 max-md:min-w-0 max-md:flex-1 max-md:p-0 max-md:whitespace-normal">
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
                  <TableCell className="px-3 py-2.5 align-middle max-md:order-3 max-md:p-0">
                    <div className="flex w-24 flex-col items-start gap-1.5">
                      <MemberRankingScoreBadge score={item.composite_score_pct} />
                      <div
                        className="h-1 w-full overflow-hidden rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${scoreRatio * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  {/* Active member count */}
                  <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                    {item.active_enrollment_count}
                  </TableCell>

                  {/* Awarded category (always null for now per backend contract) */}
                  <td aria-hidden="true" className="hidden max-md:order-5 max-md:block max-md:h-0 max-md:basis-full" />
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground max-md:order-6 max-md:p-0 max-md:text-[13px]">
                    {item.awarded_category?.name ?? "—"}
                  </TableCell>

                  {/* Calculated at */}
                  <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle text-sm text-muted-foreground max-md:order-7 max-md:block max-md:p-0 max-md:text-[13px]">
                    {calculatedAt}
                  </TableCell>

                  {/* Action */}
                  <TableCell className="px-3 py-2.5 align-middle max-md:order-4 max-md:p-0">
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
      </DataTableShell>

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
