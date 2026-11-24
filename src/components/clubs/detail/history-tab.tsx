"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getClubHistoryFromClient, type ClubHistoryItem } from "@/lib/api/club-detail";
import { formatAuditActorName } from "@/lib/api/audit-logs";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { filterHistoryItems, historyEventKey } from "@/lib/clubs/detail-history";
import { useFormatDateTime } from "@/lib/format-locale";
import type { SectionMembersGroup } from "@/lib/clubs/types";

interface HistoryTabProps {
  clubId: number;
  sections: SectionMembersGroup[];
}

const PAGE_SIZE = 25;
const KNOWN_ACTIONS = new Set(["CREATED", "UPDATED", "DELETED"]);

export function HistoryTab({ clubId, sections }: HistoryTabProps) {
  const t = useTranslations("people.clubDetail.history");
  const tOld = useTranslations("clubs.detail.history");
  const formatDateTime = useFormatDateTime();
  const [items, setItems] = useState<ClubHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failure, setFailure] = useState<ErrorStateFromError | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [sectionFilter, setSectionFilter] = useState("all");

  const loadPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setFailure(null);
      try {
        const page = await getClubHistoryFromClient(clubId, { limit: PAGE_SIZE, cursor });
        setItems((current) => (append ? [...current, ...page.items] : page.items));
        setNextCursor(page.next_cursor);
        setLoadedAt(new Date());
      } catch (error) {
        setFailure(errorStateFromError(error));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [clubId],
  );

  useEffect(() => {
    void loadPage(null, false);
  }, [loadPage]);

  const visible = useMemo(() => filterHistoryItems(items, sectionFilter), [items, sectionFilter]);
  const filtering = sectionFilter !== "all";

  function eventText(item: ClubHistoryItem) {
    if (item.summary) return item.summary;
    const action = KNOWN_ACTIONS.has(item.action)
      ? tOld(`action.${item.action}` as "action.CREATED")
      : item.action;
    return `${action} · ${item.entity_type}`;
  }

  // A first-page failure is an error, never an empty history.
  if (!loading && failure && items.length === 0) {
    return (
      <ErrorState
        kind={failure.kind}
        {...(failure.detail ? { detail: failure.detail } : {})}
        onRetry={() => void loadPage(null, false)}
        icon={History}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-full flex-col gap-1.5 sm:w-[220px]">
          <Label htmlFor="club-history-section" className="text-muted-foreground text-xs">
            {tOld("filterSection")}
          </Label>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger id="club-history-section" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tOld("allSections")}</SelectItem>
              {sections.map((section) => (
                <SelectItem key={section.sectionId} value={String(section.sectionId)}>
                  {section.sectionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtering ? (
        <p role="note" className="text-muted-foreground text-sm">
          {t("filteringLoaded")}
        </p>
      ) : null}

      {failure && items.length > 0 && loadedAt ? (
        <StaleDataNotice at={loadedAt} onRetry={() => void loadPage(nextCursor, true)} />
      ) : null}

      {loading ? (
        <div role="status" aria-busy="true" className="space-y-2 rounded-xl bg-card p-4 shadow-card">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          variant={filtering && items.length > 0 ? "no-results" : "default"}
          icon={History}
          title={filtering && items.length > 0 ? t("noResultsTitle") : tOld("emptyTitle")}
          description={
            filtering && items.length > 0 ? t("noResultsDescription") : tOld("emptyDescription")
          }
        />
      ) : (
        <ul className="divide-y rounded-xl bg-card px-4 shadow-card">
          {visible.map((item) => {
            const actor = formatAuditActorName(item.actor);
            return (
              <li
                key={historyEventKey(item)}
                className="grid gap-x-4 gap-y-0.5 py-3 text-sm sm:grid-cols-[11rem_1fr_auto]"
              >
                <time
                  dateTime={item.created_at}
                  className="text-muted-foreground tabular-nums sm:text-[13px]"
                >
                  {formatDateTime(item.created_at)}
                </time>
                <span>{eventText(item)}</span>
                <span className="text-muted-foreground sm:text-right">
                  {actor ?? t("system")}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor && !loading ? (
        <div className="flex justify-center">
          <Button
            loading={loadingMore}
            variant="outline"
            size="sm"
            onClick={() => void loadPage(nextCursor, true)}
          >
            {tOld("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
