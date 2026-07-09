"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Building2, Edit3, History, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getClubHistoryFromClient,
  type AuditAction,
  type ClubHistoryItem,
} from "@/lib/api/club-detail";
import { SectionColumn, SectionColumnsGrid } from "./section-column";
import type { SectionView } from "./types";

interface HistoryTabProps {
  clubId: number;
  sections: SectionView[];
}

export function ClubHistoryTab({ clubId, sections }: HistoryTabProps) {
  const t = useTranslations("clubs.detail.history");

  const query = useInfiniteQuery({
    queryKey: ["club-detail-history", clubId],
    queryFn: ({ pageParam }) =>
      getClubHistoryFromClient(clubId, {
        limit: 25,
        cursor: pageParam as string | null,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    staleTime: 60_000,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const grouped = useMemo(
    () => groupHistoryBySection(items, sections),
    [items, sections],
  );

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("loadedCount", { count: items.length })}
        </span>
      </header>

      {query.isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("loading")}
        </div>
      )}

      {query.isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("loadError")}{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => void query.refetch()}
          >
            {t("retry")}
          </button>
        </div>
      )}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <History className="size-5" />
          </span>
          <p className="text-sm font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="max-w-sm text-xs text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      )}

      {items.length > 0 ? (
        <>
          {grouped.club.length > 0 ? (
            <SectionColumn
              title={t("clubGeneralTitle")}
              countLabel={t("eventCount", { count: grouped.club.length })}
            >
              <HistoryList items={grouped.club} />
            </SectionColumn>
          ) : null}

          <SectionColumnsGrid>
            {sections.map((section) => {
              const sectionItems =
                grouped.bySection.get(section.sectionId ?? -1) ?? [];
              return (
                <SectionColumn
                  key={section.sectionId ?? section.kind}
                  title={section.label}
                  accent={section.meta.donutHex}
                  countLabel={t("eventCount", { count: sectionItems.length })}
                >
                  {sectionItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("sectionEmpty")}</p>
                  ) : (
                    <HistoryList items={sectionItems} />
                  )}
                </SectionColumn>
              );
            })}
          </SectionColumnsGrid>

          {query.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                {t("loadMore")}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function HistoryList({ items }: { items: ClubHistoryItem[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <Row key={item.audit_log_id} item={item} />
      ))}
    </ol>
  );
}

function groupHistoryBySection(items: ClubHistoryItem[], sections: SectionView[]) {
  const bySection = new Map<number, ClubHistoryItem[]>();
  const club: ClubHistoryItem[] = [];

  for (const section of sections) {
    if (section.sectionId != null) {
      bySection.set(section.sectionId, []);
    }
  }

  for (const item of items) {
    const sectionId = resolveHistorySectionId(item, sections);
    if (sectionId === "club") {
      club.push(item);
      continue;
    }
    if (sectionId != null) {
      const list = bySection.get(sectionId) ?? [];
      list.push(item);
      bySection.set(sectionId, list);
      continue;
    }
    club.push(item);
  }

  return { club, bySection };
}

function resolveHistorySectionId(
  item: ClubHistoryItem,
  sections: SectionView[],
): number | "club" | null {
  if (item.entity_type === "club") return "club";

  if (item.entity_type === "club_section") {
    const sectionId = Number(item.entity_id);
    return sections.some((section) => section.sectionId === sectionId)
      ? sectionId
      : null;
  }

  if (item.entity_type === "role_assignment") {
    const summary = item.summary?.toLowerCase() ?? "";
    for (const section of sections) {
      if (summary.includes(section.label.toLowerCase())) {
        return section.sectionId;
      }
    }
  }

  return null;
}

function Row({ item }: { item: ClubHistoryItem }) {
  const t = useTranslations("clubs.detail.history");
  const tone = ACTION_TONE[item.action];
  const Icon = ENTITY_ICON[item.entity_type] ?? History;
  const created = new Date(item.created_at);
  const dateLabel = formatDateLong(created);
  const timeLabel = created.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const actorName = item.actor ? formatActorName(item.actor) : t("systemActor");
  const entityLabel =
    item.entity_type === "club"
      ? t("entity.club")
      : item.entity_type === "club_section"
        ? t("entity.club_section")
        : item.entity_type === "role_assignment"
          ? t("entity.role_assignment")
          : item.entity_type;

  return (
    <li className="space-y-1 border-b border-border/60 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            tone.badge,
          )}
        >
          <Icon className="size-3" />
          {t(`action.${item.action}` as "action.CREATED")}
        </span>
        <span className="text-[11px] text-muted-foreground">{entityLabel}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          · {dateLabel} {timeLabel}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">
        {item.summary ?? `${item.entity_type} ${item.action.toLowerCase()}`}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {t("byActor", { name: actorName })}
      </p>
    </li>
  );
}

const ACTION_TONE: Record<AuditAction, { badge: string }> = {
  CREATED: { badge: "bg-success/15 text-success" },
  UPDATED: { badge: "bg-info/15 text-info" },
  DELETED: { badge: "bg-destructive/15 text-destructive" },
};

const ENTITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  club: Building2,
  club_section: Edit3,
  role_assignment: Users,
};

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatActorName(actor: {
  name: string | null;
  paternal_last_name: string | null;
}): string {
  const parts = [actor.name, actor.paternal_last_name].filter(Boolean);
  return parts.join(" ").trim() || "Usuario";
}
