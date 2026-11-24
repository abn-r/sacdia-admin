"use client";

import { useState } from "react";
import { BarChart3, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SectionRankingItem } from "@/lib/api/section-rankings";
import { useFormatDateTime, useFormatNumber } from "@/lib/format-locale";
import { buildSectionRankingLabel } from "@/lib/section-rankings/section-label";
import { SectionMembersSheet, type SectionMembersSheetTarget } from "./section-members-sheet";

interface SectionRankingsTableProps {
  data: SectionRankingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  yearId: number;
  yearLabel?: string;
  /** True when a club filter is active (changes the empty copy). */
  filtered?: boolean;
  /** Club name to show when the rows do not carry one (e.g. the active club filter). */
  fallbackClubName?: string | null;
}

/**
 * Progress of each section with the club it belongs to. The score is a number
 * (no band, no bar); members open in a sheet without leaving the list.
 */
export function SectionRankingsTable({
  data,
  total,
  page,
  limit,
  totalPages,
  yearId,
  yearLabel,
  filtered = false,
  fallbackClubName = null,
}: SectionRankingsTableProps) {
  const t = useTranslations("evaluation.progress.section");
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();
  const [target, setTarget] = useState<SectionMembersSheetTarget | null>(null);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        variant={filtered ? "no-results" : "default"}
        title={t("emptyTitle")}
        description={filtered ? t("emptyFilteredDescription") : t("emptyDescription")}
      />
    );
  }

  const rows = data.map((item) => {
    const clubName = item.club_name ?? fallbackClubName;
    return {
      item,
      clubName,
      label: buildSectionRankingLabel(item.section_name, clubName, item.section_name),
      score:
        item.composite_score_pct === null
          ? null
          : `${formatNumber(item.composite_score_pct, { maximumFractionDigits: 1 })}%`,
      calculated: item.composite_calculated_at ? formatDateTime(item.composite_calculated_at) : "—",
      open: () =>
        setTarget({
          sectionId: item.club_section_id,
          title: clubName ?? item.section_name,
          subtitle: clubName ? item.section_name : null,
        }),
    };
  });

  const identity = (clubName: string | null, sectionName: string) =>
    clubName && clubName.toLowerCase() !== sectionName.toLowerCase() ? (
      <>
        <span className="block font-medium">{clubName}</span>
        <span className="block text-[13px] text-muted-foreground">{sectionName}</span>
      </>
    ) : (
      <span className="block font-medium">{sectionName}</span>
    );

  return (
    <div className="space-y-4">
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("colSection")}</TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">{t("colScore")}</TableHead>
              <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">{t("colMembers")}</TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("colCalculated")}</TableHead>
              <RowActionsHead className="h-9 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.item.club_section_id}>
                <TableCell className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={row.open}
                    className="rounded-sm text-left outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {identity(row.clubName, row.item.section_name)}
                  </button>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right tabular-nums">
                  {row.score ?? <span className="text-muted-foreground">{t("noScore")}</span>}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right tabular-nums">{row.item.active_enrollment_count}</TableCell>
                <TableCell className="px-3 py-2.5 text-muted-foreground">{row.calculated}</TableCell>
                <TableCell className="px-3 py-2.5">
                  <RowActions
                    label={row.label}
                    actions={[{ label: t("viewMembers"), icon: Users, onSelect: row.open }]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell className="md:hidden">
        <ul aria-label={t("listLabel")} className="divide-y">
          {rows.map((row) => (
            <li key={row.item.club_section_id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                {identity(row.clubName, row.item.section_name)}
                <span className="block text-[13px] tabular-nums text-muted-foreground">
                  {t("membersCount", { count: row.item.active_enrollment_count })}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums">{row.score ?? <span className="text-muted-foreground">{t("noScore")}</span>}</span>
                <Button variant="ghost" size="sm" onClick={row.open} aria-label={`${t("viewMembers")} · ${row.label}`}>
                  <Users aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </DataTableShell>

      <DataTablePagination page={page} totalPages={totalPages} total={total} limit={limit} />

      <SectionMembersSheet
        target={target}
        yearId={yearId}
        yearLabel={yearLabel}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      />
    </div>
  );
}
