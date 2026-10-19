"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  UserPlus,
  Clock,
  ShieldCheck,
  Info,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { MembershipRejectDialog } from "@/components/membership/membership-reject-dialog";
import { MembershipConsentVerifyDialog } from "@/components/membership/membership-consent-verify-dialog";
import { useConsentErrorMessage } from "@/components/membership/use-consent-error-message";
import {
  listMembershipRequestsFromClient,
  approveMembershipRequest,
  getConsentErrorCode,
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { ApiError } from "@/lib/api/client";
import { useFormatDate, useFormatDateTime } from "@/lib/format-locale";
import { useRoleLabel } from "@/lib/auth/role-labels";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(user?: MembershipRequest["users"]): string {
  if (!user) return "\u2014";
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.email ?? "\u2014";
}

function getUserEmail(user?: MembershipRequest["users"]): string {
  return user?.email ?? "\u2014";
}

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingMembersTableProps {
  clubSectionId: number;
  initialRequests: MembershipRequest[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PendingMembersTable({
  clubSectionId,
  initialRequests,
}: PendingMembersTableProps) {
  const t = useTranslations("membership");
  const formatDate = useFormatDate();
  const formatDatetime = useFormatDateTime();
  const translateRole = useRoleLabel();
  const tConsent = useTranslations("membership.consent");
  const consentErrorMessage = useConsentErrorMessage();

  const getRoleName = (role?: MembershipRequest["roles"]): string => {
    const raw = role?.role_name ?? "member";
    return translateRole(raw);
  };
  const [requests, setRequests] = useState<MembershipRequest[]>(initialRequests);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<MembershipRequest | null>(null);
  const [consentDialog, setConsentDialog] = useState<MembershipRequest | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await listMembershipRequestsFromClient(clubSectionId);
      setRequests(fresh);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("table.refresh_error");
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [clubSectionId, t]);

  const handleApprove = async (req: MembershipRequest) => {
    setProcessingId(req.assignment_id);
    try {
      await approveMembershipRequest(clubSectionId, req.assignment_id);
      toast.success(t("toasts.approved", { name: getUserName(req.users) }));
      await refresh();
    } catch (error) {
      if (getConsentErrorCode(error)) {
        // e.g. MR_CONSENT_NOT_VERIFIED: the list was stale. Explain and re-sync.
        toast.error(consentErrorMessage(error, "approve"));
        await refresh();
      } else {
        const message =
          error instanceof ApiError
            ? error.message
            : t("errors.approve");
        toast.error(message);
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t(
            requests.length === 1 ? "table.count_one" : "table.count_other",
            { count: requests.length },
          )}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t("table.refresh")}
        </Button>
      </div>

      {/* Empty state */}
      {requests.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={t("table.empty_title")}
          description={t("table.empty_description")}
        />
      ) : (
        /* Table */
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  {t("table.col_member")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  {t("table.col_role")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  {t("table.col_requested")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                  {t("table.col_expires")}
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">
                  {t("table.col_actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const isProcessing = processingId === req.assignment_id;
                const consent = req.consent ?? null;
                const consentPending = consent?.status === "pending";
                const expiry = getEffectiveExpiry(req);
                const expiring = isExpiringSoon(expiry);

                return (
                  <TableRow
                    key={req.assignment_id}
                    className="hover:bg-muted/30"
                  >
                    {/* Member info */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="space-y-0.5">
                        <p className="font-medium leading-none">
                          {getUserName(req.users)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getUserEmail(req.users)}
                        </p>
                        {consent && (
                          <Badge
                            variant={consentPending ? "soft-warning" : "soft-success"}
                            className="mt-1"
                          >
                            {consentPending
                              ? tConsent("badge_pending")
                              : tConsent("badge_verified")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                      <Badge variant="outline" className="capitalize">
                        {getRoleName(req.roles)}
                      </Badge>
                    </TableCell>

                    {/* Requested date */}
                    <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                      {req.created_at ? formatDate(req.created_at) : "—"}
                    </TableCell>

                    {/* Expires at */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        {expiring && (
                          <Clock className="size-3.5 text-warning" />
                        )}
                        <span
                          className={`text-sm tabular-nums ${
                            expiring
                              ? "font-medium text-warning"
                              : "text-muted-foreground"
                          }`}
                        >
                          {expiry ? formatDatetime(expiry) : "—"}
                        </span>
                        {consentPending && (
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
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {isProcessing && (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}

                        {consentPending && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-primary hover:bg-primary/10 hover:text-primary"
                                onClick={() => setConsentDialog(req)}
                                disabled={isProcessing || isRefreshing}
                                aria-label={tConsent("verify_action_aria")}
                              >
                                <ShieldCheck className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tConsent("verify_action")}</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            {/* A disabled button does not emit pointer events: the span keeps the tooltip reachable. */}
                            <span tabIndex={consentPending ? 0 : undefined}>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-success hover:bg-success/10 hover:text-success"
                                onClick={() => handleApprove(req)}
                                disabled={isProcessing || isRefreshing || consentPending}
                                aria-label={t("table.aria_approve")}
                              >
                                <CheckCircle2 className="size-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {consentPending
                              ? tConsent("approve_blocked")
                              : t("table.tooltip_approve")}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setRejectDialog(req)}
                              disabled={isProcessing || isRefreshing}
                              aria-label={t("table.aria_reject")}
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("table.tooltip_reject")}</TooltipContent>
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

      {/* Consent verification dialog (minors) */}
      {consentDialog && (
        <MembershipConsentVerifyDialog
          open
          clubSectionId={clubSectionId}
          request={consentDialog}
          onOpenChange={(open) => {
            if (!open) setConsentDialog(null);
          }}
          onSuccess={() => {
            setConsentDialog(null);
            refresh();
          }}
        />
      )}

      {/* Reject dialog */}
      {rejectDialog && (
        <MembershipRejectDialog
          open
          clubSectionId={clubSectionId}
          request={rejectDialog}
          onOpenChange={(open) => {
            if (!open) setRejectDialog(null);
          }}
          onSuccess={() => {
            setRejectDialog(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
