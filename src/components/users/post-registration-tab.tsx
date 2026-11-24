"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ResendInvitationButton } from "@/components/users/detail/resend-invitation-button";
import {
  completeStep1Action,
  completeStep2Action,
} from "@/lib/post-registration/actions";
import {
  resolveOnboardingMode,
  type PhotoStatusResponse,
  type PostRegistrationStatus,
} from "@/lib/api/post-registration";
import { useFormatDateTime } from "@/lib/format-locale";
import {
  applicablePostRegistrationSteps,
  isStepForceable,
  summarizePostRegistration,
  type PostRegistrationStepKey,
} from "@/lib/users/detail-model";

interface PostRegistrationTabProps {
  userId: string;
  status: PostRegistrationStatus;
  /** `null` when the photo check failed: the photo line is simply not shown. */
  photoStatus?: PhotoStatusResponse | null;
  canOverride: boolean;
  /** `AdminUserDetail.invitation_pending`: the invitation was not accepted yet. */
  invitationPending?: boolean;
  /** Same permission that gates user creation (`users.create`). */
  canResendInvitation?: boolean;
}

type StepRowState = "complete" | "pending";

/**
 * Post-registro: only the current state and what is missing. No step bar, no
 * per-step requirement lists.
 */
export function PostRegistrationTab({
  userId,
  status,
  photoStatus = null,
  canOverride,
  invitationPending = false,
  canResendInvitation = false,
}: PostRegistrationTabProps) {
  const t = useTranslations("people.userDetail.post");
  const tOld = useTranslations("users.postRegistration");
  const formatDateTime = useFormatDateTime();
  const [forcing, setForcing] = useState<PostRegistrationStepKey | null>(null);

  const mode = resolveOnboardingMode(status);
  const summary = summarizePostRegistration(status);
  const steps = applicablePostRegistrationSteps(mode);
  const anyForceable = summary.missing.some(isStepForceable);

  const stepLabels: Record<PostRegistrationStepKey, string> = {
    profilePicture: t("stepProfilePicture"),
    personalInfo: t("stepPersonalInfo"),
    clubSelection: t("stepClubSelection"),
  };

  async function force(step: PostRegistrationStepKey) {
    const action = step === "profilePicture" ? completeStep1Action : completeStep2Action;
    const result = await action(userId);
    if (!result.ok) throw new Error(result.error);
    toast.success(result.message);
  }

  return (
    <div className="space-y-8">
      {mode === "panel_only" ? (
        <Alert>
          <AlertDescription>{tOld("panel_only_notice")}</AlertDescription>
        </Alert>
      ) : (
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-base tracking-tight">
              {summary.state === "complete" ? t("stateComplete") : t("stateInProgress")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {summary.state === "complete"
                ? status.dateCompleted
                  ? tOld("status_completed_at", { date: formatDateTime(status.dateCompleted) })
                  : t("allDone")
                : t("missing", { count: summary.missing.length })}
            </p>
          </div>

          <ul className="divide-y rounded-xl border bg-card">
            {steps.map((step) => {
              const state: StepRowState = status.steps[step] ? "complete" : "pending";
              const canForce = state === "pending" && canOverride && isStepForceable(step);
              const manual = state === "pending" && !isStepForceable(step);
              return (
                <li
                  key={step}
                  data-step={step}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{stepLabels[step]}</div>
                    {step === "profilePicture" && photoStatus ? (
                      <div className="text-muted-foreground text-xs">
                        {photoStatus.has_photo
                          ? tOld("photo_has_label")
                          : tOld("photo_none_label")}
                      </div>
                    ) : null}
                    {manual ? (
                      <div className="text-muted-foreground text-xs">{t("onlyThePerson")}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    {state === "complete" ? (
                      <span className="text-muted-foreground text-sm">{t("stepDone")}</span>
                    ) : (
                      <ExceptionStatus<StepRowState>
                        value={state}
                        normal={["complete"]}
                        labels={{ complete: t("stepDone"), pending: tOld("step_status_pending") }}
                        intents={{ pending: "warning" }}
                      />
                    )}
                    {canForce ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setForcing(step)}
                      >
                        {t("forceStep")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {!canOverride && anyForceable ? (
            <p className="text-muted-foreground text-sm">{t("readonlyNotice")}</p>
          ) : null}
        </section>
      )}

      {invitationPending && canResendInvitation ? (
        <section className="space-y-3">
          <h3 className="font-semibold text-base tracking-tight">{t("invitationTitle")}</h3>
          <p className="text-muted-foreground text-sm">
            {tOld("resend_invitation_description")}
          </p>
          <ResendInvitationButton userId={userId} />
        </section>
      ) : null}

      {forcing ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setForcing(null);
          }}
          title={t("forceTitle", { step: stepLabels[forcing] })}
          description={t("forceDescription")}
          confirmLabel={t("forceConfirm")}
          tone="destructive"
          onConfirm={() => force(forcing)}
        />
      ) : null}
    </div>
  );
}
