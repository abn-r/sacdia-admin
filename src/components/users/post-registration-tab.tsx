"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  Image as ImageIcon,
  User,
  Building2,
  ShieldAlert,
  Mail,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { resendAdminUserInvitationFromClient } from "@/lib/api/admin-users";
import {
  completeStep1Action,
  completeStep2Action,
  completeStep3Action,
} from "@/lib/post-registration/actions";
import {
  resolveOnboardingMode,
  type PostRegistrationStatus,
  type PhotoStatusResponse,
} from "@/lib/api/post-registration";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StepStaticConfig {
  key: keyof PostRegistrationStatus["steps"];
  number: 1 | 2 | 3;
  icon: React.ElementType;
}

interface StepConfig extends StepStaticConfig {
  label: string;
  description: string;
  requires: string[];
}

interface PostRegistrationTabProps {
  userId: string;
  status: PostRegistrationStatus;
  photoStatus: PhotoStatusResponse;
  canOverride: boolean;
  /** `AdminUserDetail.invitation_pending`: the invitation was not accepted yet. */
  invitationPending?: boolean;
  /** Same permission that gates user creation (`users.create`). */
  canResendInvitation?: boolean;
}

// ─── Static step structure (no translatable strings) ─────────────────────────

const STEPS_STATIC: StepStaticConfig[] = [
  { key: "profilePicture", number: 1, icon: ImageIcon },
  { key: "personalInfo", number: 2, icon: User },
  { key: "clubSelection", number: 3, icon: Building2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Override button + confirmation dialog ────────────────────────────────────

interface OverrideButtonProps {
  stepNumber: 1 | 2 | 3;
  stepLabel: string;
  userId: string;
  disabled?: boolean;
}

function OverrideButton({
  stepNumber,
  stepLabel,
  userId,
  disabled,
}: OverrideButtonProps) {
  const t = useTranslations("users");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const action =
        stepNumber === 1
          ? completeStep1Action
          : stepNumber === 2
            ? completeStep2Action
            : completeStep3Action;

      const result = await action(userId);

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.error);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button
        loading={isPending}
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="mt-3"
      >
        <ShieldAlert className="size-4" />
        {t("postRegistration.force_complete_button")}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("postRegistration.force_dialog_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("postRegistration.force_dialog_description", {
                number: stepNumber,
                label: stepLabel,
              })}
              <br />
              <br />
              {t("postRegistration.force_dialog_detail")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("postRegistration.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              loading={isPending}
              onClick={handleConfirm}
            >
              {t("postRegistration.force_confirming")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Account access card (resend invitation) ─────────────────────────────────

function AccountAccessCard({ userId }: { userId: string }) {
  const t = useTranslations("users.postRegistration");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleResend() {
    startTransition(async () => {
      try {
        await resendAdminUserInvitationFromClient(userId);
        toast.success(t("resend_invitation_success"));
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          toast.error(t("resend_invitation_already_accepted"));
          // The invitation is no longer pending: reload so the card goes away.
          router.refresh();
        } else if (error instanceof ApiError && error.status === 429) {
          toast.error(t("resend_invitation_rate_limited"));
        } else if (error instanceof ApiError && error.status === 503) {
          toast.error(t("resend_invitation_unavailable"));
        } else {
          toast.error(t("resend_invitation_failed"));
        }
      }
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{t("account_access_title")}</CardTitle>
        <p className="text-[13px] text-muted-foreground">
          {t("resend_invitation_description")}
        </p>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={isPending}
          onClick={handleResend}
        >
          <Mail className="size-4" />
          {t("resend_invitation")}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PostRegistrationTab({
  userId,
  status,
  photoStatus,
  canOverride,
  invitationPending = false,
  canResendInvitation = false,
}: PostRegistrationTabProps) {
  const t = useTranslations("users");
  const onboardingMode = resolveOnboardingMode(status);
  const panelOnly = onboardingMode === "panel_only";
  // Outside `club` the account never picks a club here: step 3 does not apply.
  const clubStepApplies = onboardingMode === "club";
  // `panel_only` never walks the steps, so nothing is "next" either.
  const nextStep = panelOnly ? null : status.nextStep;

  // Build step config with translated strings inside the component
  const STEPS: StepConfig[] = [
    {
      ...STEPS_STATIC[0]!,
      label: t("postRegistration.step1_label"),
      description: t("postRegistration.step1_description"),
      requires: [t("postRegistration.step1_req1")],
    },
    {
      ...STEPS_STATIC[1]!,
      label: t("postRegistration.step2_label"),
      description: t("postRegistration.step2_description"),
      requires: [
        t("postRegistration.step2_req1"),
        t("postRegistration.step2_req2"),
        t("postRegistration.step2_req3"),
        t("postRegistration.step2_req4"),
        t("postRegistration.step2_req5"),
      ],
    },
    {
      ...STEPS_STATIC[2]!,
      label: t("postRegistration.step3_label"),
      description: t("postRegistration.step3_description"),
      requires: [
        t("postRegistration.step3_req1"),
        t("postRegistration.step3_req2"),
        t("postRegistration.step3_req3"),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Account access: resend the invitation while it is pending */}
      {invitationPending && canResendInvitation ? (
        <AccountAccessCard userId={userId} />
      ) : null}

      {/* panel_only: no steps in the app */}
      {panelOnly ? (
        <Alert>
          <AlertDescription>{t("postRegistration.panel_only_notice")}</AlertDescription>
        </Alert>
      ) : null}

      {/* Overall status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base">
              {t("postRegistration.status_card_title")}
            </CardTitle>
            {status.complete && status.dateCompleted ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("postRegistration.status_completed_at", {
                  date: formatDate(status.dateCompleted),
                })}
              </p>
            ) : null}
          </div>
          <Badge
            variant={
              panelOnly ? "outline" : status.complete ? "secondary" : "outline"
            }
          >
            {panelOnly
              ? t("postRegistration.step_status_not_applicable")
              : status.complete
                ? t("postRegistration.badge_complete")
                : t("postRegistration.badge_pending")}
          </Badge>
        </CardHeader>
      </Card>

      {/* Step detail cards */}
      <div className="space-y-4">
        {STEPS.map((step) => {
              const completed = status.steps[step.key];
              const isNext = nextStep === step.key;
              const StepIcon = step.icon;

              // Step 3 cannot be force-completed from admin (requires DTO data)
              const isOverridable = step.number !== 3;
              const notApplicable = step.number === 3 && !clubStepApplies;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    notApplicable
                      ? "border-border bg-muted/30"
                      : completed
                      ? "border-success/20 bg-success/5"
                      : isNext
                        ? "border-warning/20 bg-warning/5"
                        : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                        completed && !notApplicable
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <StepIcon size={15} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{step.label}</span>
                        <Badge
                          variant={
                            notApplicable
                              ? "outline"
                              : completed
                                ? "success"
                                : isNext
                                  ? "warning"
                                  : "outline"
                          }
                        >
                          {notApplicable
                            ? t("postRegistration.step_status_not_applicable")
                            : completed
                            ? t("postRegistration.step_status_complete")
                            : isNext
                              ? t("postRegistration.step_status_pending")
                              : t("postRegistration.step_status_optional")}
                        </Badge>
                      </div>

                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {notApplicable
                          ? t("postRegistration.step3_not_applicable_description")
                          : step.description}
                      </p>

                      {/* Requirements list */}
                      {!notApplicable && (
                      <ul className="mt-2 space-y-0.5">
                        {step.requires.map((req) => (
                          <li
                            key={req}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <CheckCircle2
                              size={11}
                              className={
                                completed ? "text-success" : "text-muted-foreground/40"
                              }
                            />
                            {req}
                          </li>
                        ))}
                      </ul>
                      )}

                      {/* Override action — only shown when step is NOT completed */}
                      {!completed && !notApplicable && canOverride && isOverridable && (
                        <OverrideButton
                          stepNumber={step.number}
                          stepLabel={step.label}
                          userId={userId}
                        />
                      )}

                      {/* Step 3 note when not completed */}
                      {!completed && !notApplicable && step.number === 3 && (
                        <p className="mt-3 text-2xs text-muted-foreground italic">
                          {t("postRegistration.step3_note")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Photo status card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("postRegistration.photo_card_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span
              aria-label={
                photoStatus.has_photo
                  ? t("postRegistration.photo_aria_has")
                  : t("postRegistration.photo_aria_none")
              }
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                photoStatus.has_photo
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <ImageIcon size={18} />
            </span>
            <div>
              <p className="text-sm font-medium">
                {photoStatus.has_photo
                  ? t("postRegistration.photo_has_label")
                  : t("postRegistration.photo_none_label")}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {photoStatus.has_photo
                  ? t("postRegistration.photo_has_description")
                  : t("postRegistration.photo_none_description")}
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <Badge variant={photoStatus.has_photo ? "success" : "warning"}>
                {photoStatus.has_photo
                  ? t("postRegistration.photo_badge_has")
                  : t("postRegistration.photo_badge_none")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission notice for read-only admins */}
      {!canOverride && (
        <p className="text-center text-sm text-muted-foreground">
          {t("postRegistration.readonly_notice")}{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            registration:complete
          </code>
          .
        </p>
      )}
    </div>
  );
}
