"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getClubHistoryFromClient,
  type ClubHistoryItem,
} from "@/lib/api/club-detail";
import type { SectionMembersGroup } from "@/lib/clubs/types";

interface HistoryTabProps {
  clubId: number;
  sections: SectionMembersGroup[];
}

const SECTION_ENTITY_TYPES = new Set([
  "club_section",
  "class_counselor_assignment",
  "role_assignment",
]);

function entityLabel(
  entityType: string,
  t: ReturnType<typeof useTranslations<"clubs.detail.history">>,
) {
  if (entityType === "club_section") return t("entity.club_section");
  if (entityType === "class_counselor_assignment") {
    return t("entity.class_counselor_assignment");
  }
  if (entityType === "role_assignment") return t("entity.role_assignment");
  return entityType;
}

export function HistoryTab({ clubId, sections }: HistoryTabProps) {
  const t = useTranslations("clubs.detail.history");
  const locale = useLocale();
  const [items, setItems] = useState<ClubHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState("all");

  const loadPage = useCallback(
    async (pageCursor: string | null, append: boolean) => {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const page = await getClubHistoryFromClient(clubId, {
          limit: 25,
          cursor: pageCursor,
        });
        setItems((current) => (append ? [...current, ...page.items] : page.items));
        setNextCursor(page.next_cursor);
      } catch {
        setError(t("loadError"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [clubId, t],
  );

  useEffect(() => {
    void loadPage(null, false);
  }, [loadPage]);

  const filteredItems = useMemo(() => {
    const sectionItems = items.filter((item) =>
      SECTION_ENTITY_TYPES.has(item.entity_type),
    );
    if (sectionFilter === "all") return sectionItems;
    return sectionItems.filter((item) => item.entity_id === sectionFilter);
  }, [items, sectionFilter]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ClubHistoryItem[]>();
    for (const item of filteredItems) {
      const key = item.entity_type;
      const bucket = groups.get(key) ?? [];
      bucket.push(item);
      groups.set(key, bucket);
    }
    return Array.from(groups.entries());
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="w-[220px]">
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("filterSection")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allSections")}</SelectItem>
              {sections.map((section) => (
                <SelectItem key={section.sectionId} value={String(section.sectionId)}>
                  {section.sectionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("loading")}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!loading && !error && filteredItems.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <History className="size-5" />
          </span>
          <p className="text-sm font-semibold">{t("emptyTitle")}</p>
          <p className="max-w-sm text-xs text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : null}

      <div className="space-y-6">
        {groupedItems.map(([entityType, groupItems]) => (
          <div key={entityType} className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {entityLabel(entityType, t)}
            </h4>
            {groupItems.map((item) => {
              const created = new Date(item.created_at);
              return (
                <Card key={item.audit_log_id}>
                  <CardContent className="px-4 py-4">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                      {created.toLocaleDateString(locale, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      ·{" "}
                      {created.toLocaleTimeString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <h5 className="mt-2 text-sm font-semibold">
                      {item.summary ??
                        `${item.entity_type} ${item.action.toLowerCase()}`}
                    </h5>
                    {item.actor?.name ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("byActor", { name: item.actor.name })}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void loadPage(nextCursor, true)}
          >
            {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
