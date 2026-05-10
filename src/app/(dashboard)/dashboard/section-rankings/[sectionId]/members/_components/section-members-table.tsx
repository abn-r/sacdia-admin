"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { MemberRankingScoreBadge } from "@/app/(dashboard)/dashboard/member-rankings/_components/member-ranking-score-badge";
import type { MemberRankingItem } from "@/lib/api/section-rankings";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionMembersTableProps {
  data: MemberRankingItem[];
  /** year_id passed through for the breakdown link */
  yearId: number;
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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders a flat (non-paginated) list of members belonging to a section.
 *
 * No pagination needed — backend returns a flat array < 100 members per section.
 *
 * Columns (7 data + 1 action = 8):
 *   # | Miembro | Composite | Clase | Investidura | Camporees | Categoría | Acción
 *
 * Acción links to the member breakdown page (/dashboard/member-rankings/[id]/breakdown)
 * because that page already owns the detailed view — reusing it avoids duplication.
 */
export function SectionMembersTable({
  data,
  yearId,
}: SectionMembersTableProps) {
  const t = useTranslations("rankings.sectionMembersTable");

  function formatInvestitureScore(value: number | null | undefined): string {
    if (value === null || value === undefined) return "—";
    if (value === 100) return t("investedLabel");
    return t("inProgressLabel");
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 w-14 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("colRank")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("colMember")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("colComposite")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("colClass")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("colInvestiture")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("colCamporee")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("colCategory")}
            </TableHead>
            <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("colAction")}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.member_ranking_id}
              className="hover:bg-muted/30"
            >
              {/* Rank */}
              <TableCell className="px-3 py-2.5 align-middle">
                <span className="tabular-nums text-sm font-medium text-foreground">
                  {item.rank_position !== null ? `#${item.rank_position}` : "—"}
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

              {/* Composite score */}
              <TableCell className="px-3 py-2.5 align-middle">
                <MemberRankingScoreBadge score={item.composite_score_pct} />
              </TableCell>

              {/* Class score */}
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                {formatScorePct(item.class_score_pct)}
              </TableCell>

              {/* Investiture derived from score */}
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

              {/* Action — links to existing member breakdown page */}
              <TableCell className="px-3 py-2.5 align-middle text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={`/dashboard/member-rankings/${item.enrollment_id}/breakdown?year_id=${yearId}`}
                  >
                    {t("viewDetail")}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
