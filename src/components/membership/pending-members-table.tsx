"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Info, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { MembershipConsentVerifyDialog } from "@/components/membership/membership-consent-verify-dialog";
import {
  MembershipRequestSheet,
  membershipUserName,
} from "@/components/membership/membership-request-sheet";
import { useConsentErrorMessage } from "@/components/membership/use-consent-error-message";
import { CONSENT_QUEUE_KEY } from "@/components/membership/consent-queue-keys";
import {
  listMembershipRequestsFromClient,
  VERIFY_BLOCK_CODE,
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { useFormatDate, useFormatDateTime } from "@/lib/format-locale";
import { useRoleLabel } from "@/lib/auth/role-labels";
import type { MembershipReviewMode } from "@/lib/auth/membership-review-mode";

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";

/** The date the request really lapses: the computed one wins over the base timeout. */
function getEffectiveExpiry(req: MembershipRequest): string | null {
  return req.effective_expires_at ?? req.expires_at ?? null;
}

function isExpiringSoon(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  // Less than 48 hours
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
}

interface PendingMembersTableProps {
  clubSectionId: number;
  initialRequests: MembershipRequest[];
  /**
   * `verify-only` (consent:verify without club_members:approve): rows only offer
   * the guardian-form sheet; approve and reject are not rendered.
   */
  mode?: MembershipReviewMode;
}

type SheetState =
  | { kind: "verify"; request: MembershipRequest }
  | { kind: "review"; request: MembershipRequest }
  | null;

export function PendingMembersTable({
  clubSectionId,
  initialRequests,
  mode = "approve",
}: PendingMembersTableProps) {
  const verifyOnly = mode === "verify-only";
  const t = useTranslations("membership");
  const tq = useTranslations("queues.requests.membership");
  const tConsent = useTranslations("membership.consent");
  const formatDate = useFormatDate();
  const formatDatetime = useFormatDateTime();
  const translateRole = useRoleLabel();
  const consentErrorMessage = useConsentErrorMessage();
  const queryClient = useQueryClient();

  const [requests, setRequests] = useState<MembershipRequest[]>(initialRequests);
  const [staleSince, setStaleSince] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await listMembershipRequestsFromClient(clubSectionId);
      setRequests(fresh);
      setUpdatedAt(Date.now());
      setStaleSince(null);
    } catch {
      // Keep what is on screen and say so; never swap it for an empty list.
      setStaleSince(updatedAt);
    } finally {
      setRefreshing(false);
    }
  }, [clubSectionId, updatedAt]);

  const roleName = (role?: MembershipRequest["roles"]) => translateRole(role?.role_name ?? "member");

  function verifyState(req: MembershipRequest) {
    const consent = req.consent ?? null;
    const consentPending = consent?.status === "pending";
    // Nothing to verify until a guardian (or club custody) exists.
    const nothingToVerify = consent !== null && consent.guardianship_id === null;
    // Server verdict: the viewer registered/uploaded the minor or is their guardian.
    const verifyBlock = consent?.viewer_verify_block ?? null;
    return {
      consentPending,
      verifyDisabled: consentPending && (nothingToVerify || verifyBlock !== null),
      tooltip: verifyBlock
        ? consentErrorMessage(VERIFY_BLOCK_CODE[verifyBlock])
        : nothingToVerify
          ? tConsent("verify_no_guardian")
          : tConsent("verify_action"),
    };
  }

  function actionFor(req: MembershipRequest) {
    const name = membershipUserName(req.users);
    const { consentPending, verifyDisabled, tooltip } = verifyState(req);
    if (consentPending) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* A disabled button does not emit pointer events: the span keeps the tooltip reachable. */}
            <span tabIndex={verifyDisabled ? 0 : undefined}>
              <Button
                size="sm"
                variant="soft"
                disabled={verifyDisabled}
                aria-label={`${tq("verifyAction")}: ${name}`}
                onClick={() => setSheet({ kind: "verify", request: req })}
              >
                {tq("verifyAction")}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      );
    }
    if (verifyOnly) return null;
    return (
      <Button
        size="sm"
        variant="soft"
        aria-label={`${tq("reviewAction")}: ${name}`}
        onClick={() => setSheet({ kind: "review", request: req })}
      >
        {tq("reviewAction")}
      </Button>
    );
  }

  /** Only the exception is marked: a guardian form still to verify. */
  function exceptionMark(req: MembershipRequest) {
    if (req.consent?.status !== "pending") return null;
    return <StatusBadge intent="warning" label={tq("consentPending")} />;
  }

  const hint = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="img"
          aria-label={tConsent("expiry_extended_hint")}
          className="inline-flex text-muted-foreground"
        >
          <Info className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{tConsent("expiry_extended_hint")}</TooltipContent>
    </Tooltip>
  );

  if (requests.length === 0) {
    return (
      <div className="space-y-4">
        {staleSince !== null ? <StaleDataNotice at={staleSince} onRetry={() => void refresh()} /> : null}
        <EmptyState
          icon={UserPlus}
          title={t(verifyOnly ? "table.empty_title_verify_only" : "table.empty_title")}
          description={t(verifyOnly ? "table.empty_description_verify_only" : "table.empty_description")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {staleSince !== null ? <StaleDataNotice at={staleSince} onRetry={() => void refresh()} /> : null}

      <DataTableShell aria-busy={refreshing}>
        <Table className="max-md:block">
          <TableHeader className="max-md:sr-only">
            <TableRow>
              <TableHead className={HEAD}>{t("table.col_member")}</TableHead>
              <TableHead className={HEAD}>{t("table.col_role")}</TableHead>
              <TableHead className={HEAD}>{t("table.col_requested")}</TableHead>
              <TableHead className={HEAD}>{t("table.col_expires")}</TableHead>
              <TableHead className={HEAD}>
                <span className="sr-only">{tq("columns.mark")}</span>
              </TableHead>
              <TableHead data-testid="actions-head" className={`${HEAD} text-right`}>
                <span className="sr-only">{t("table.col_actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="max-md:block">
            {requests.map((req) => {
              const expiry = getEffectiveExpiry(req);
              const expiring = isExpiringSoon(expiry);
              const consentPending = req.consent?.status === "pending";
              return (
                <TableRow
                  key={req.assignment_id}
                  className="hover:bg-muted/30 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1 max-md:px-4 max-md:py-3"
                >
                  <TableCell className="px-3 py-2.5 align-middle max-md:order-1 max-md:min-w-0 max-md:flex-1 max-md:p-0 max-md:whitespace-normal">
                    <p className="text-sm font-medium leading-none">{membershipUserName(req.users)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{req.users?.email ?? "—"}</p>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm max-md:order-4 max-md:p-0 max-md:text-[13px] max-md:text-muted-foreground">
                    {roleName(req.roles)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground max-md:order-5 max-md:p-0 max-md:text-[13px]">
                    {req.created_at ? formatDate(req.created_at) : "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle max-md:order-6 max-md:p-0">
                    <div className="flex items-center gap-1.5">
                      {expiring && <Clock className="size-3.5 text-warning" />}
                      <span
                        className={`text-sm tabular-nums max-md:text-[13px] ${expiring ? "font-medium text-warning" : "text-muted-foreground"}`}
                      >
                        {expiry ? formatDatetime(expiry) : "—"}
                      </span>
                      {consentPending && hint}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle max-md:order-3 max-md:w-full max-md:p-0 max-md:empty:hidden">
                    {exceptionMark(req)}
                  </TableCell>
                  <TableCell data-testid="actions-cell" className="px-3 py-2.5 text-right align-middle max-md:order-2 max-md:p-0">
                    <div className="flex justify-end">{actionFor(req)}</div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {sheet?.kind === "verify" && (
        <MembershipConsentVerifyDialog
          open
          clubSectionId={clubSectionId}
          request={sheet.request}
          canApprove={!verifyOnly}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onRejected={() => {
            setSheet(null);
            void refresh();
          }}
          onSuccess={() => {
            setSheet(null);
            void refresh();
            // The coordinator's aggregate queue (not mounted here) now holds a
            // verified row: mark it stale so returning to it refetches.
            void queryClient.invalidateQueries({ queryKey: CONSENT_QUEUE_KEY });
          }}
        />
      )}

      {sheet?.kind === "review" && (
        <MembershipRequestSheet
          key={sheet.request.assignment_id}
          clubSectionId={clubSectionId}
          request={sheet.request}
          canReview={!verifyOnly}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onDone={() => void refresh()}
        />
      )}
    </div>
  );
}
