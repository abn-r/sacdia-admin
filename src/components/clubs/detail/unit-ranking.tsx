"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Unit } from "@/lib/api/units";
import {
  countUnitMembers,
  getUnitLeaderInitials,
  getUnitLeaderName,
} from "./helpers";
import {
  detectSectionKind,
  getSectionMeta,
  type ClubSectionRaw,
} from "./types";

interface UnitRankingProps {
  units: Unit[];
  sectionLookup: Map<number, ClubSectionRaw>;
  limit?: number;
}

export function UnitRanking({
  units,
  sectionLookup,
  limit,
}: UnitRankingProps) {
  const t = useTranslations("clubs.pages.detail.unitRanking");

  if (units.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  const ranked = [...units]
    .map((unit) => {
      const sectionRaw =
        unit.club_section_id != null
          ? sectionLookup.get(unit.club_section_id)
          : undefined;
      const kind = sectionRaw
        ? detectSectionKind(sectionRaw)
        : "unknown";
      const meta = getSectionMeta(kind);
      const members = countUnitMembers(unit);
      return { unit, kind, meta, members };
    })
    .sort((a, b) => b.members - a.members);

  const top = limit ? ranked.slice(0, limit) : ranked;
  const maxMembers = Math.max(1, ...top.map((r) => r.members));

  return (
    <ul className="grid gap-1.5">
      {top.map((row, idx) => {
        const pct = (row.members / maxMembers) * 100;
        return (
          <li
            key={row.unit.unit_id}
            className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 transition-colors hover:bg-muted"
          >
            <span className="font-mono text-xs font-bold text-muted-foreground">
              #{String(idx + 1).padStart(2, "0")}
            </span>
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={cn(
                  "grid size-7 place-items-center rounded-md text-[10px] font-bold",
                  row.meta.iconBg,
                )}
              >
                {getUnitLeaderInitials(row.unit)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                  <span className="truncate">{row.unit.name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 text-[9.5px] font-semibold uppercase tracking-wider",
                      row.meta.pill,
                    )}
                  >
                    {row.meta.label.slice(0, 4)}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {t("leaderPrefix")} · {getUnitLeaderName(row.unit)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", row.meta.barBg)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right text-sm font-bold text-foreground tabular-nums">
                {row.members}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
