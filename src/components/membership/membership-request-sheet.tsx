"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ReviewSheet } from "@/components/requests/review-sheet";
import { useConsentErrorMessage } from "@/components/membership/use-consent-error-message";
import {
  approveMembershipRequest,
  getConsentErrorCode,
  rejectMembershipRequest,
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { ApiError } from "@/lib/api/client";
import { useFormatDate, useFormatDateTime } from "@/lib/format-locale";
import { useRoleLabel } from "@/lib/auth/role-labels";

export function membershipUserName(user?: MembershipRequest["users"]): string {
  if (!user) return "—";
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return user.email ?? "—";
}

interface MembershipRequestSheetProps {
  clubSectionId: number;
  request: MembershipRequest;
  /** Only reviewers with club_members:approve can approve or reject. */
  canReview: boolean;
  /** Open straight on the reason form. */
  startRejecting?: boolean;
  onOpenChange: (open: boolean) => void;
  /** The list changed (approved, rejected or found stale): refresh it. */
  onDone: () => void;
}

/**
 * Side sheet for a membership request that needs no guardian form (adults and
 * minors whose form is already verified). Rejecting happens inside it.
 */
export function MembershipRequestSheet({
  clubSectionId,
  request,
  canReview,
  startRejecting = false,
  onOpenChange,
  onDone,
}: MembershipRequestSheetProps) {
  const t = useTranslations("membership");
  const tq = useTranslations("queues.requests.membership.sheet");
  const translateRole = useRoleLabel();
  const formatDate = useFormatDate();
  const formatDateTime = useFormatDateTime();
  const consentErrorMessage = useConsentErrorMessage();
  const name = membershipUserName(request.users);
  const expiry = request.effective_expires_at ?? request.expires_at ?? null;

  function messageOf(error: unknown): string {
    if (getConsentErrorCode(error)) return consentErrorMessage(error, "approve");
    return error instanceof ApiError ? error.message : t("errors.approve");
  }

  return (
    <ReviewSheet
      open
      onOpenChange={onOpenChange}
      title={tq("title", { name })}
      description={tq("description", { date: request.created_at ? formatDate(request.created_at) : "—" })}
      startRejecting={startRejecting}
      errorMessage={messageOf}
      {...(canReview
        ? {
            approve: {
              label: tq("approve"),
              onConfirm: async () => {
                try {
                  await approveMembershipRequest(clubSectionId, request.assignment_id);
                } catch (error) {
                  // A stale list (e.g. consent not verified yet): re-sync, then explain.
                  if (getConsentErrorCode(error)) onDone();
                  throw error;
                }
                toast.success(t("toasts.approved", { name }));
                onDone();
              },
            },
            reject: {
              label: tq("rejectAction"),
              confirmLabel: tq("rejectConfirm"),
              audience: tq("rejectAudience"),
              onConfirm: async (reason: string) => {
                await rejectMembershipRequest(clubSectionId, request.assignment_id, reason);
                toast.success(t("toasts.rejected", { name }));
                onDone();
              },
            },
          }
        : {})}
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{tq("person")}</dt>
          <dd className="mt-0.5">
            {name}
            {request.users?.email ? <span className="block text-muted-foreground">{request.users.email}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{tq("role")}</dt>
          <dd className="mt-0.5">{translateRole(request.roles?.role_name ?? "member")}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{tq("expires")}</dt>
          <dd className="mt-0.5 tabular-nums">{expiry ? formatDateTime(expiry) : "—"}</dd>
        </div>
        {request.consent?.status === "verified" ? (
          <div>
            <dt className="text-xs text-muted-foreground">{tq("guardianForm")}</dt>
            <dd className="mt-0.5">{tq("guardianFormVerified")}</dd>
          </div>
        ) : null}
      </dl>
    </ReviewSheet>
  );
}
