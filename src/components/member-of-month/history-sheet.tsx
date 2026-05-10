"use client";

import { useState } from "react";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getMemberOfMonthHistory } from "@/lib/api/member-of-month";
import type { MemberOfMonthHistoryItem } from "@/lib/api/member-of-month";
import { MONTH_NAMES } from "@/lib/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 12;

// ─── History item ─────────────────────────────────────────────────────────────

type TranslationFn = ReturnType<typeof useTranslations<"member_of_month">>;

function HistoryEntry({
  item,
  t,
}: {
  item: MemberOfMonthHistoryItem;
  t: TranslationFn;
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      {/* Period header */}
      <div className="mb-2 flex items-center gap-2">
        <Trophy className="size-3.5 shrink-0 text-warning" />
        <span className="text-sm font-semibold">
          {MONTH_NAMES[item.month]} {item.year}
        </span>
        {item.members.length > 1 && (
          <Badge variant="warning" className="text-[10px]">
            {t("history.tie")}
          </Badge>
        )}
      </div>

      {/* Winners */}
      <div className="space-y-2">
        {item.members.map((member) => {
          const initials = member.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3"
            >
              <Avatar className="size-8">
                {member.photo_url && (
                  <AvatarImage src={member.photo_url} alt={member.name} />
                )}
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.name}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                {t("history.points", { count: member.total_points })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border px-4 py-3 space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-40 flex-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MemberOfMonthHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sectionId: number;
  sectionName: string;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const memberOfMonthHistoryQueryKey = (
  clubId: number,
  sectionId: number,
  page: number,
) => ["member-of-month-history", clubId, sectionId, page] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberOfMonthHistorySheet({
  open,
  onOpenChange,
  clubId,
  sectionId,
  sectionName,
}: MemberOfMonthHistorySheetProps) {
  const t = useTranslations("member_of_month");
  const [page, setPage] = useState(1);

  const { data, isLoading: loading } = useQuery({
    queryKey: memberOfMonthHistoryQueryKey(clubId, sectionId, page),
    queryFn: async () => {
      try {
        return await getMemberOfMonthHistory(clubId, sectionId, page, PAGE_LIMIT);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t("errors.load_history_failed");
        toast.error(message);
        throw err;
      }
    },
    // Each page is a historical snapshot — rarely changes.
    staleTime: 5 * 60_000,
    // Only fetch when the sheet is open.
    enabled: open,
    // Reset to page 1 when sheet re-opens
    placeholderData: (prev) => prev,
  });

  // Reset to page 1 when the sheet closes.
  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) setPage(1);
    onOpenChange(isOpen);
  }

  const items: MemberOfMonthHistoryItem[] = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-warning" />
            {t("history.title")}
          </SheetTitle>
          <SheetDescription>
            {t("history.description", { sectionName })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <HistorySkeleton />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">{t("history.empty_title")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("history.empty_description")}
              </p>
            </div>
          ) : (
            items.map((item, idx) => (
              <HistoryEntry key={`${item.year}-${item.month}-${idx}`} item={item} t={t} />
            ))
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_LIMIT && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-xs text-muted-foreground">
              {t("history.pagination_label", { page, total: totalPages })}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!hasPrev || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
