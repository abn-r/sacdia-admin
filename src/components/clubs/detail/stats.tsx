"use client";

import { Award, ClipboardList, Layers, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const t = useTranslations("clubs.detail.overview.stats");
  const members = getTotalMembers(sections);
  const capacity = getTotalCapacity(sections);
  const occupancyPct = pctOf(members, capacity);
  const activeSections = sections.filter((s) => s.active).length;
  const inactiveCount = Math.max(0, sections.length - activeSections);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal">{t("members")}</CardTitle>
          <CardDescription className="text-3xl leading-none tracking-tight text-foreground tabular-nums">
            {members}
            {capacity != null ? (
              <span className="ml-1 text-base font-normal text-muted-foreground">
                / {capacity}
              </span>
            ) : null}
          </CardDescription>
          <CardAction className="grid size-8 place-items-center rounded-md bg-muted">
            <Users className="size-4 text-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {capacity != null
              ? t("membersCapacity", { occupancy: occupancyPct })
              : t("noCapacity")}
          </p>
          {capacity != null ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal">{t("sections")}</CardTitle>
          <CardDescription className="text-3xl leading-none tracking-tight text-foreground tabular-nums">
            {activeSections}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              / {sections.length || 3}
            </span>
          </CardDescription>
          <CardAction className="grid size-8 place-items-center rounded-md bg-muted">
            <Layers className="size-4 text-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {activeSections === 3
              ? t("sectionsAllActive")
              : t("sectionsInactive", { count: inactiveCount })}
          </p>
          <div className="mt-3 flex gap-1">
            {sections.map((s) => (
              <span
                key={s.kind + (s.sectionId ?? "")}
                className={cn(
                  "h-1.5 flex-1 rounded-sm",
                  s.active ? s.meta.barBg : "bg-muted",
                )}
                title={s.label}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal">{t("units")}</CardTitle>
          <CardDescription className="text-3xl leading-none tracking-tight text-foreground tabular-nums">
            {unitsCount}
          </CardDescription>
          <CardAction className="grid size-8 place-items-center rounded-md bg-muted">
            <Award className="size-4 text-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {unitsCount === 0
              ? t("unitsEmpty")
              : t("unitsAvg", {
                  avg: Math.round(members / Math.max(1, unitsCount)),
                })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal">{t("pending")}</CardTitle>
          <CardDescription className="text-3xl leading-none tracking-tight text-foreground tabular-nums">
            {pendingRequests ?? "—"}
          </CardDescription>
          <CardAction className="grid size-8 place-items-center rounded-md bg-muted">
            <ClipboardList className="size-4 text-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {pendingRequests == null
              ? t("pendingNoData")
              : pendingRequests === 0
                ? t("pendingEmpty")
                : t("pendingWaiting")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
