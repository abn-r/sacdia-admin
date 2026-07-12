"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { getClubHistoryFromClient } from "@/lib/api/club-detail";

const SECTION_ENTITY_TYPES = new Set([
  "club_section",
  "class_counselor_assignment",
  "role_assignment",
]);

interface SectionHistoryProps {
  clubId: number;
}

export function SectionHistoryPanel({ clubId }: SectionHistoryProps) {
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
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-normal leading-none">
          {t("historyTitle")}
        </CardTitle>
        <CardDescription className="max-w-prose leading-snug">
          {t("historyLead")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        {query.isLoading ? (
          <div className="space-y-2 px-4 pb-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="px-4 pb-2">
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t("historyError")}{" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => void query.refetch()}
              >
                {t("retry")}
              </button>
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 pb-2">
            <EmptyState
              icon={History}
              title={t("historyEmptyTitle")}
              description={t("historyEmptyLead")}
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
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
                  <li key={item.audit_log_id} className="px-4 py-3">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {dateLabel} · {timeLabel}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {item.summary ?? `${item.entity_type} ${item.action.toLowerCase()}`}
                    </p>
                  </li>
                );
              })}
            </ul>

            {query.hasNextPage ? (
              <div className="flex justify-center px-4 pb-2">
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
        )}
      </CardContent>
    </Card>
  );
}
