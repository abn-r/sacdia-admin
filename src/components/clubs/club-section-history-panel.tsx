"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClubHistoryFromClient } from "@/lib/api/club-detail";

const SECTION_ENTITY_TYPES = new Set([
  "club_section",
  "class_counselor_assignment",
  "role_assignment",
]);

interface ClubSectionHistoryPanelProps {
  clubId: number;
}

export function ClubSectionHistoryPanel({ clubId }: ClubSectionHistoryPanelProps) {
  const t = useTranslations("clubs.sections.workspace");
  const locale = useLocale();

  const query = useInfiniteQuery({
    queryKey: ["club-section-history", clubId],
    queryFn: ({ pageParam }) =>
      getClubHistoryFromClient(clubId, {
        limit: 25,
        cursor: pageParam as string | null,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    staleTime: 60_000,
  });

  const items = useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.items) ?? [];
    return all.filter((item) => SECTION_ENTITY_TYPES.has(item.entity_type));
  }, [query.data]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:items-start">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{t("historyTitle")}</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("historyLead")}</p>
      </div>

      <div className="space-y-3">
        {query.isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("loadingHistory")}
          </div>
        )}

        {query.isError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {t("historyError")}{" "}
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
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <History className="size-5" />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("historyEmptyTitle")}</p>
            <p className="max-w-sm text-xs text-muted-foreground">{t("historyEmptyLead")}</p>
          </div>
        )}

        {items.slice(0, 6).map((item) => {
          const created = new Date(item.created_at);
          const timeLabel = created.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          });
          const dateLabel = created.toLocaleDateString(locale, {
            day: "2-digit",
            month: "short",
          });

          return (
            <Card key={item.audit_log_id}>
              <CardContent className="px-4 py-4">
                <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {dateLabel} · {timeLabel}
                </p>
                <h4 className="mt-2 text-sm font-semibold">
                  {item.summary ?? `${item.entity_type} ${item.action.toLowerCase()}`}
                </h4>
              </CardContent>
            </Card>
          );
        })}

        {query.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage && <Loader2 className="size-3.5 animate-spin" />}
              {t("loadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
