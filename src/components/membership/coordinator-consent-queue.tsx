"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { MembershipConsentVerifyDialog } from "@/components/membership/membership-consent-verify-dialog";
import { useConsentErrorMessage } from "@/components/membership/use-consent-error-message";
import {
  CONSENT_QUEUE_KEY as QUEUE_KEY,
  SECTION_LISTS_KEY,
} from "@/components/membership/consent-queue-keys";
import {
  getConsentErrorCode,
  listCoordinatorConsentPendingFromClient,
  VERIFY_BLOCK_CODE,
  type CoordinatorConsentPendingItem,
  type CoordinatorConsentPendingPage,
} from "@/lib/api/membership-requests";
import { useFormatDateTime } from "@/lib/format-locale";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CONSENT_QUEUE_PAGE_SIZE = 25;


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMinorName(user?: CoordinatorConsentPendingItem["users"]): string {
  if (!user) return "—";
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.email ?? "—";
}

/** Same actions-column pin as the per-section table: verify stays reachable on narrow widths. */
const ACTIONS_HEAD_STICKY = "sticky right-0 z-10 border-l border-border/60 bg-card";
const ACTIONS_CELL_STICKY =
  "sticky right-0 z-10 border-l border-border/60 bg-card group-hover/row:bg-[color-mix(in_oklab,var(--card),var(--muted)_30%)]";

const HEAD_CLASS = "h-9 px-3 text-xs font-medium text-muted-foreground";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoordinatorConsentQueueProps {
  /**
   * A section chip of the summary was clicked. The parent switches to that
   * section's own (existing) per-section list: the queue is paginated by offset
   * across all sections, so a client-side filter of the loaded page would hide
   * forms that sit on other pages.
   */
  onSelectSection: (clubSectionId: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * One queue of consent forms across every section the coordinator covers
 * (GET /coordination/me/consent-pending), oldest form first. Verify-only: the
 * dialog never approves nor uploads. After a verification the row is dropped and
 * the counts decremented locally, then the active page is refetched; other cached
 * pages are only marked stale.
 */
export function CoordinatorConsentQueue({ onSelectSection }: CoordinatorConsentQueueProps) {
  const t = useTranslations("membership.queue");
  const tTable = useTranslations("membership.table");
  const tConsent = useTranslations("membership.consent");
  const tPagination = useTranslations("shared.pagination");
  const formatDatetime = useFormatDateTime();
  const consentErrorMessage = useConsentErrorMessage();
  const queryClient = useQueryClient();

  const [offset, setOffset] = useState(0);
  const [dialogItem, setDialogItem] = useState<CoordinatorConsentPendingItem | null>(null);

  const queryKey = [...QUEUE_KEY, offset] as const;
  const query = useQuery<CoordinatorConsentPendingPage, Error>({
    queryKey,
    queryFn: () =>
      listCoordinatorConsentPendingFromClient({ limit: CONSENT_QUEUE_PAGE_SIZE, offset }),
    staleTime: 60_000,
  });

  const page = query.data;

  const errorCode = query.error ? getConsentErrorCode(query.error) : null;
  // Permission / scope errors do not heal by retrying; anything else may.
  const isGenericError =
    query.error !== null &&
    errorCode !== "GUARD_PERMISSION_DENIED" &&
    errorCode !== "GUARD_CLUB_SCOPE_REQUIRED";

  const loadError = (() => {
    if (!query.error) return null;
    const code = getConsentErrorCode(query.error);
    if (code === "GUARD_PERMISSION_DENIED") return t("error_permission");
    if (code === "GUARD_CLUB_SCOPE_REQUIRED") return t("error_scope");
    return t("error_generic");
  })();

  /**
   * A form left the queue (verified here, or already handled by someone else).
   * The cached page is patched right away so the row disappears at once, then the
   * active page is refetched: the page shrank, so it refills from the server and
   * "next" (offset + limit) does not skip a row. Other cached pages and the
   * per-section lists are only marked stale.
   */
  function handleGone(item: CoordinatorConsentPendingItem) {
    const current = queryClient.getQueryData<CoordinatorConsentPendingPage>(queryKey);

    let moveToOffset: number | null = null;
    if (current) {
      const items = current.items.filter((row) => row.assignment_id !== item.assignment_id);
      if (items.length !== current.items.length) {
        const total = Math.max(0, current.total - 1);
        const by_section = current.by_section
          .map((section) =>
            section.club_section_id === item.club_section_id
              ? { ...section, pending_consent_count: section.pending_consent_count - 1 }
              : section,
          )
          .filter((section) => section.pending_consent_count > 0);

        queryClient.setQueryData<CoordinatorConsentPendingPage>(queryKey, {
          ...current,
          items,
          total,
          by_section,
        });

        // The page emptied but forms remain elsewhere: go to the last page that
        // exists instead of showing a blank one.
        if (items.length === 0 && total > 0) {
          const lastOffset =
            Math.floor((total - 1) / CONSENT_QUEUE_PAGE_SIZE) * CONSENT_QUEUE_PAGE_SIZE;
          const nextOffset = Math.min(offset, lastOffset);
          if (nextOffset !== offset) moveToOffset = nextOffset;
        }
      }
    }

    // Moving pages: the old key must not refetch (it is about to be inactive).
    void queryClient.invalidateQueries({
      queryKey: QUEUE_KEY,
      refetchType: moveToOffset === null ? "active" : "none",
    });
    void queryClient.invalidateQueries({ queryKey: SECTION_LISTS_KEY, refetchType: "none" });
    if (moveToOffset !== null) setOffset(moveToOffset);
  }

  const hasPager = page !== undefined && (page.total > page.limit || page.offset > 0);
  const currentPage = page ? Math.floor(page.offset / page.limit) + 1 : 1;
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.limit)) : 1;
  const from = page && page.items.length > 0 ? page.offset + 1 : 0;
  const to = page ? page.offset + page.items.length : 0;

  return (
    <div className="space-y-4">
      {query.isPending && (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-md border p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-8 w-16" />
            </div>
          ))}
        </div>
      )}

      {!query.isPending && loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{loadError}</p>
          {isGenericError && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
              {t("retry")}
            </Button>
          )}
        </div>
      )}

      {page && !loadError && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t(page.total === 1 ? "count_one" : "count_other", { count: page.total })}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
              {tTable("refresh")}
            </Button>
          </div>

          {/* Section summary */}
          {page.by_section.length > 0 && (
            <div className="space-y-1.5">
              <div
                role="group"
                aria-label={t("summary_title")}
                className="flex flex-wrap items-center gap-2"
              >
                {page.by_section.map((section) => (
                  <Button
                    key={section.club_section_id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectSection(section.club_section_id)}
                  >
                    {[
                      section.club_name ?? t("club_fallback"),
                      section.club_type_name ?? "—",
                      section.district_name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    <Badge variant="soft-warning">{section.pending_consent_count}</Badge>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("summary_hint")}</p>
            </div>
          )}

          {page.items.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title={t("empty_title")}
              description={t("empty_description")}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={HEAD_CLASS}>{t("col_club")}</TableHead>
                    <TableHead className={HEAD_CLASS}>{t("col_type")}</TableHead>
                    <TableHead className={HEAD_CLASS}>{t("col_district")}</TableHead>
                    <TableHead className={HEAD_CLASS}>{t("col_minor")}</TableHead>
                    <TableHead className={HEAD_CLASS}>{t("col_form_uploaded")}</TableHead>
                    <TableHead className={`${HEAD_CLASS} text-right ${ACTIONS_HEAD_STICKY}`}>
                      {t("col_actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.items.map((item) => {
                    const consent = item.consent ?? null;
                    // Nothing to verify until a guardian (or club custody) exists.
                    const nothingToVerify = consent !== null && consent.guardianship_id === null;
                    // Server verdict (UI hint; verify-consent stays the authority).
                    const verifyBlock = consent?.viewer_verify_block ?? null;
                    const verifyDisabled = nothingToVerify || verifyBlock !== null;

                    return (
                      <TableRow key={item.assignment_id} className="group/row hover:bg-muted/30">
                        <TableCell className="px-3 py-2.5 align-middle text-sm font-medium">
                          {item.club_name ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                          {item.club_type_name ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                          {item.district_name ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle">
                          <p className="font-medium leading-none">{getMinorName(item.users)}</p>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                          {item.consent_form_uploaded_at
                            ? formatDatetime(item.consent_form_uploaded_at)
                            : "—"}
                        </TableCell>
                        <TableCell className={`px-3 py-2.5 align-middle ${ACTIONS_CELL_STICKY}`}>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {/* A disabled button does not emit pointer events: the span keeps the tooltip reachable. */}
                                <span tabIndex={verifyDisabled ? 0 : undefined}>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-primary hover:bg-primary/10 hover:text-primary"
                                    onClick={() => setDialogItem(item)}
                                    disabled={verifyDisabled}
                                    aria-label={t("verify_aria", { name: getMinorName(item.users) })}
                                  >
                                    <ShieldCheck className="size-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {verifyBlock
                                  ? consentErrorMessage(VERIFY_BLOCK_CODE[verifyBlock])
                                  : nothingToVerify
                                    ? tConsent("verify_no_guardian")
                                    : tConsent("verify_action")}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pager (offset) */}
          {hasPager && (
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                {tPagination("showing", { from, to, total: page.total })}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  {tPagination("pageOf", { page: currentPage, totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page.offset <= 0 || query.isFetching}
                  aria-label={tPagination("prevPage")}
                  onClick={() => setOffset(Math.max(0, page.offset - page.limit))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page.offset + page.limit >= page.total || query.isFetching}
                  aria-label={tPagination("nextPage")}
                  onClick={() => setOffset(page.offset + page.limit)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Consent verification dialog: verify-only, against the item's own section */}
      {dialogItem && (
        <MembershipConsentVerifyDialog
          open
          clubSectionId={dialogItem.club_section_id}
          request={dialogItem}
          canApprove={false}
          onOpenChange={(open) => {
            if (!open) setDialogItem(null);
          }}
          onSuccess={() => {
            const verified = dialogItem;
            setDialogItem(null);
            handleGone(verified);
          }}
          onVerifyError={(error) => {
            // Someone else verified (or removed) this form: the row is gone for
            // good, so drop it instead of leaving a dead action behind.
            if (getConsentErrorCode(error) === "MR_NOT_FOUND") {
              const gone = dialogItem;
              setDialogItem(null);
              handleGone(gone);
            }
          }}
        />
      )}
    </div>
  );
}
