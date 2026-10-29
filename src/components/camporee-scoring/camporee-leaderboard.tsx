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
import { EmptyState } from "@/components/shared/empty-state";
import { formatTabularNumber } from "@/lib/format-locale";
import { buildSectionCoverage } from "@/lib/camporee-scoring/leaderboard-coverage";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeEventRubric,
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
  rubricsByEvent?: Record<number, CamporeeEventRubric[]>;
  targetsByEvent?: Record<number, CamporeeScoringTarget[]>;
}

function formatNumber(value: number) {
  return formatTabularNumber(value);
}

export function CamporeeLeaderboard({
  leaderboard,
  events,
  rubricsByEvent,
  targetsByEvent,
}: CamporeeLeaderboardProps) {
  const t = useTranslations("camporees.leaderboard");
  const rows = useMemo(() => leaderboard?.rows ?? [], [leaderboard]);

  const coverage = useMemo(() => {
    if (!events || !rubricsByEvent || !targetsByEvent) return null;
    return buildSectionCoverage(
      events,
      rubricsByEvent,
      targetsByEvent,
      new Map(rows.map((row) => [row.club_section_id, row.total_max_points])),
    );
  }, [events, rows, rubricsByEvent, targetsByEvent]);

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
        </header>
        <EmptyState icon={Trophy} title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("eyebrow")}
        </p>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead>{t("colRank")}</TableHead>
              <TableHead>{t("colClub")}</TableHead>
              <TableHead>{t("colSection")}</TableHead>
              <TableHead className="text-right">{t("colAwarded")}</TableHead>
              <TableHead className="text-right">{t("colMax")}</TableHead>
              <TableHead className="text-right">{t("colPercent")}</TableHead>
              {coverage && <TableHead>{t("colCoverage")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.club_section_id}-${row.rank}`}>
                <TableCell className="font-medium tabular-nums">#{row.rank}</TableCell>
                <TableCell>{row.club_name ?? "—"}</TableCell>
                <TableCell>
                  {row.section_name ?? t("sectionFallback", { id: row.club_section_id })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.total_awarded_points)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.total_max_points)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.percentage)}%
                </TableCell>
                {coverage && (
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {(() => {
                      const section = coverage.get(row.club_section_id);
                      if (!section || section.scorableEvents === 0) return "—";
                      if (section.scoredEvents !== null) {
                        return t("coverageEvents", {
                          scored: section.scoredEvents,
                          total: section.scorableEvents,
                        });
                      }
                      return t("coveragePoints", {
                        scored: formatNumber(row.total_max_points),
                        total: formatNumber(section.possibleMaxPoints),
                      });
                    })()}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
