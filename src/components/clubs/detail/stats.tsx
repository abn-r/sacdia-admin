"use client";

import { Award, ClipboardList, Layers, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  getTotalCapacity,
  getTotalMembers,
  pctOf,
} from "./helpers";
import type { SectionView } from "./types";

interface StatsProps {
  sections: SectionView[];
  unitsCount: number;
  pendingRequests?: number | null;
}

export function ClubDetailStats({
  sections,
  unitsCount,
  pendingRequests,
}: StatsProps) {
  const t = useTranslations("clubs.pages.detail.stats");

  const members = getTotalMembers(sections);
  const capacity = getTotalCapacity(sections);
  const occupancyPct = pctOf(members, capacity);
  const activeSections = sections.filter((s) => s.active).length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<Users className="size-3 " />}
        label={t("membersLabel")}
      >
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {members}
          {capacity != null && (
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              / {capacity}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {capacity != null
            ? t("membersOccupancy", { pct: occupancyPct })
            : t("membersNoTarget")}
        </p>
        {capacity != null && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-warning"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        )}
      </StatCard>

      <StatCard
        icon={<Layers className="size-3" />}
        label={t("sectionsLabel")}
      >
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {activeSections}
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            / {sections.length || 3}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {activeSections === 3
            ? t("sectionsAll")
            : t("sectionsInactive", { count: 3 - activeSections })}
        </p>
        <div className="mt-3 flex gap-1">
          {sections.map((s) => (
            <span
              key={s.kind + (s.sectionId ?? "")}
              className={cn(
                "h-1.5 flex-1 rounded-sm",
                s.active ? s.meta.barBg : "bg-muted",
              )}
              title={`${s.label} · ${s.active ? t("sectionBarActive") : t("sectionBarInactive")}`}
            />
          ))}
        </div>
      </StatCard>

      <StatCard
        icon={<Award className="size-3" />}
        label={t("unitsLabel")}
      >
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {unitsCount}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {unitsCount === 0
            ? t("unitsEmpty")
            : t("unitsAvg", { avg: Math.round(members / Math.max(1, unitsCount)) })}
        </p>
      </StatCard>

      <StatCard
        icon={<ClipboardList className="size-3" />}
        label={t("requestsLabel")}
      >
        <div className="text-2xl font-bold tracking-tight text-foreground">
          {pendingRequests ?? "—"}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {pendingRequests == null
            ? t("requestsNoData")
            : pendingRequests === 0
              ? t("requestsEmpty")
              : t("requestsPending")}
        </p>
      </StatCard>
    </div>
  );
}

function StatCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
