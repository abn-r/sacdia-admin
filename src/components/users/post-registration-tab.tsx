"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Image as ImageIcon,
  User,
  Building2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  completeStep1Action,
  completeStep2Action,
  completeStep3Action,
} from "@/lib/post-registration/actions";
import type {
  PostRegistrationStatus,
  PhotoStatusResponse,
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

// ─── Step status icon ─────────────────────────────────────────────────────────

function StepStatusIcon({
  completed,
  isNext,
  t,
}: {
  completed: boolean;
  isNext: boolean;
  t: ReturnType<typeof useTranslations<"users">>;
}) {
  if (completed) {
    return (
      <span
        aria-label={t("postRegistration.step_aria_completed")}
        className="flex size-8 items-center justify-center rounded-full bg-success/10"
      >
        <CheckCircle2 className="size-5 text-success" />
      </span>
    );
  }
  if (isNext) {
    return (
      <span
        aria-label={t("postRegistration.step_aria_pending")}
        className="flex size-8 items-center justify-center rounded-full bg-warning/10"
      >
        <Clock className="size-5 text-warning-foreground" />
      </span>
    );
  }
  return (
    <span
      aria-label={t("postRegistration.step_aria_not_started")}
      className="flex size-8 items-center justify-center rounded-full bg-muted"
    >
      <Circle className="size-5 text-muted-foreground" />
    </span>
  );
}

// ─── Step connector ───────────────────────────────────────────────────────────

function StepConnector({
  completed,
  orientation = "horizontal",
}: {
  completed: boolean;
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "ml-4 w-px self-stretch",
          completed ? "bg-success/40" : "bg-border",
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "mx-4 h-px flex-1",
        completed ? "bg-success/40" : "bg-border",
      )}
    />
  );
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
        size="sm"
        variant="outline"
        disabled={disabled || isPending}
        onClick={() => setOpen(true)}
        className="mt-3"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ShieldAlert className="size-4" />
        )}
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
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("postRegistration.force_confirming")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PostRegistrationTab({
  userId,
  status,
  photoStatus,
  canOverride,
}: PostRegistrationTabProps) {
  const t = useTranslations("users");
  const nextStep = status.nextStep;

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
      {/* Overall status banner */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("postRegistration.status_card_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 pt-0 pb-4">
          <p className="text-sm text-muted-foreground">
            {status.complete
              ? t("postRegistration.status_complete", {
                  date: formatDate(status.dateCompleted),
                })
              : t("postRegistration.status_in_progress")}
          </p>
          <Badge variant={status.complete ? "success" : "warning"}>
            {status.complete
              ? t("postRegistration.badge_complete")
              : t("postRegistration.badge_pending")}
          </Badge>
        </CardContent>
      </Card>

      {/* Step progress — horizontal timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("postRegistration.steps_card_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Timeline header row — vertical on mobile, horizontal on desktop */}
          {/* Mobile: vertical stack */}
          <div className="flex flex-col gap-0 sm:hidden">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <StepStatusIcon
                    completed={status.steps[step.key]}
                    isNext={nextStep === step.key}
                    t={t}
                  />
                  <span className="text-xs font-medium leading-tight">
                    {t("postRegistration.step_label_full", {
                      number: step.number,
                      label: step.label,
                    })}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <StepConnector
                    completed={status.steps[step.key]}
                    orientation="vertical"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Desktop: horizontal timeline */}
          <div className="hidden sm:flex sm:items-center">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <StepStatusIcon
                    completed={status.steps[step.key]}
                    isNext={nextStep === step.key}
                    t={t}
                  />
                  <span className="text-xs font-medium text-center leading-tight max-w-[80px]">
                    {t("postRegistration.step_label", { number: step.number })}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <StepConnector completed={status.steps[step.key]} />
                )}
              </div>
            ))}
          </div>

          {/* Step detail cards */}
          <div className="mt-6 space-y-4">
            {STEPS.map((step) => {
              const completed = status.steps[step.key];
              const isNext = nextStep === step.key;
              const StepIcon = step.icon;

              // Step 3 cannot be force-completed from admin (requires DTO data)
              const isOverridable = step.number !== 3;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    completed
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
                        completed
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
                            completed
                              ? "success"
                              : isNext
                                ? "warning"
                                : "outline"
                          }
                        >
                          {completed
                            ? t("postRegistration.step_status_completed")
                            : isNext
                              ? t("postRegistration.step_status_pending")
                              : t("postRegistration.step_status_not_started")}
                        </Badge>
                      </div>

                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {step.description}
                      </p>

                      {/* Requirements list */}
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

                      {/* Override action — only shown when step is NOT completed */}
                      {!completed && canOverride && isOverridable && (
                        <OverrideButton
                          stepNumber={step.number}
                          stepLabel={step.label}
                          userId={userId}
                        />
                      )}

                      {/* Step 3 note when not completed */}
                      {!completed && step.number === 3 && (
                        <p className="mt-3 text-[11px] text-muted-foreground italic">
                          {t("postRegistration.step3_note")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
