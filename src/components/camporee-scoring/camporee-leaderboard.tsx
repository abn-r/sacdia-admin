"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTabularNumber } from "@/lib/format-locale";
import { buildSectionCoverage } from "@/lib/camporee-scoring/leaderboard-coverage";
import { orderResults } from "@/lib/camporee-events/results-order";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeLeaderboard as CamporeeLeaderboardData,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

export interface CamporeeLeaderboardProps {
  leaderboard?: CamporeeLeaderboardData | null;
  /**
   * Optional context used to show how much of the scorable events each
   * section has been scored on. Without it the coverage column is hidden.
   */
  events?: BackendCamporeeEvent[];
  targetsByEvent?: Record<number, CamporeeScoringTarget[]>;
}

function formatNumber(value: number) {
  return formatTabularNumber(value);
}

/**
 * Results of the camporee: points of each section over the events already
 * scored. No position badges; the only mark is "Faltan N" on a section that
 * still has scorable events without a score.
 */
export function CamporeeLeaderboard({
  leaderboard,
  events,
  targetsByEvent,
}: CamporeeLeaderboardProps) {
  const t = useTranslations("camporees.leaderboard");
  const tRes = useTranslations("evaluation.camporeeEvents.results");
  const rows = useMemo(() => orderResults(leaderboard?.rows ?? []), [leaderboard]);

  const coverage = useMemo(() => {
    if (!events || !targetsByEvent) return null;
    return buildSectionCoverage(events, targetsByEvent, rows);
  }, [events, rows, targetsByEvent]);

  if (rows.length === 0) {
    return <EmptyState icon={Trophy} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  const rowModel = rows.map((row) => {
    const section = coverage?.get(row.club_section_id);
    const scorable = section?.scorableEvents ?? 0;
    const scored = section?.scoredEvents ?? 0;
    return {
      row,
      club: row.club_name ?? "—",
      section: row.section_name ?? t("sectionFallback", { id: row.club_section_id }),
      points: tRes("pointsOf", {
        awarded: formatNumber(row.total_awarded_points),
        max: formatNumber(row.total_max_points),
      }),
      percent: `${formatNumber(row.percentage)}%`,
      scorable,
      scored,
      missing: Math.max(scorable - scored, 0),
    };
  });

  return (
    <div className="space-y-3">
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tRes("colSection")}</TableHead>
              <TableHead className="text-right">{tRes("colPoints")}</TableHead>
              <TableHead className="text-right">{tRes("colPercent")}</TableHead>
              {coverage && <TableHead>{tRes("colCoverage")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowModel.map((item) => (
              <TableRow key={item.row.club_section_id}>
                <TableCell>
                  <span className="font-medium">{item.club}</span>
                  <span className="block text-[13px] text-muted-foreground">{item.section}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{item.points}</TableCell>
                <TableCell className="text-right tabular-nums">{item.percent}</TableCell>
                {coverage && (
                  <TableCell className="tabular-nums">
                    {item.scorable === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {t("coverageEvents", { scored: item.scored, total: item.scorable })}
                        {item.missing > 0 && (
                          <StatusBadge
                            intent="warning"
                            size="xs"
                            label={tRes("missing", { count: item.missing })}
                          />
                        )}
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <ul className="md:hidden">
        {rowModel.map((item) => (
          <li key={item.row.club_section_id} className="space-y-1 border-b py-3 last:border-b-0">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{item.club}</span>
              <span className="text-sm font-medium tabular-nums">{item.percent}</span>
            </div>
            <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
              <span>{item.section}</span>
              <span>{item.points}</span>
              {coverage && item.scorable > 0 && (
                <span>{t("coverageEvents", { scored: item.scored, total: item.scorable })}</span>
              )}
            </p>
            {item.missing > 0 && (
              <StatusBadge
                intent="warning"
                size="xs"
                label={tRes("missing", { count: item.missing })}
              />
            )}
          </li>
        ))}
      </ul>

      <p className="text-[13px] text-muted-foreground">{tRes("orderHint")}</p>
    </div>
  );
}
