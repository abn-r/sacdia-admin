"use client";

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
import { cn } from "@/lib/utils";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
import type { CamporeeLeaderboard as CamporeeLeaderboardData } from "@/lib/api/camporee-scoring";

export interface CamporeeLeaderboardProps {
  leaderboard?: CamporeeLeaderboardData | null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function CamporeeLeaderboard({ leaderboard }: CamporeeLeaderboardProps) {
  const t = useTranslations("camporees.leaderboard");
  const rows = leaderboard?.rows ?? [];

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
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
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={`${row.club_section_id}-${row.rank}`}
                className={cn(STAGGER_CLASSES)}
                style={getStaggerStyle(index, 35)}
              >
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
