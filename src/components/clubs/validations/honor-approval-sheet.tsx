"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Circle, History } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { useToastError } from "@/lib/feedback/toast-retry";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import { getEvidenceDetail, type EvidenceDetail } from "@/lib/api/evidence-review";
import { reviewValidation, type PendingValidation } from "@/lib/api/validation";
import { formatCalendarDate, useFormatDate } from "@/lib/format-locale";
import { toast } from "sonner";
import { ValidationHistoryList } from "./validation-history-list";

export const REJECT_REASON_MIN = 5;
export const REVIEW_COMMENT_MAX = 500;

export function validationMemberName(v: PendingValidation): string {
  const u = v.user;
  const full = [u?.first_name, u?.last_name].filter(Boolean).join(" ");
  return full || u?.email || String(v.validation_id);
}

interface HonorApprovalSheetProps {
  validation: PendingValidation | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful approve or reject. */
  onResolved: (validation: PendingValidation) => void;
}

/**
 * Review sheet of a submitted honor (queue A): requirements met, instructor and
 * completion date before deciding. Reject lives here, with a required reason.
 */
export function HonorApprovalSheet({ validation, onOpenChange, onResolved }: HonorApprovalSheetProps) {
  return (
    <Sheet open={validation !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        {validation && (
          <SheetBody
            key={String(validation.validation_id)}
            validation={validation}
            onClose={() => onOpenChange(false)}
            onResolved={onResolved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({
  validation,
  onClose,
  onResolved,
}: {
  validation: PendingValidation;
  onClose: () => void;
  onResolved: (validation: PendingValidation) => void;
}) {
  const t = useTranslations("queues.classes.pending.sheet");
  const tEvidence = useTranslations("evidence_review.detail");
  const locale = useLocale();
  const formatDate = useFormatDate();
  const toastError = useToastError();
  const commentId = useId();
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const member = validationMemberName(validation);
  const honorName = validation.entity?.name ?? "—";
  const honorId = Number(validation.entity_id);

  const detail = useQuery({
    queryKey: ["honor-approval-detail", honorId],
    queryFn: () => getEvidenceDetail("honor", honorId),
    enabled: Number.isFinite(honorId),
  });

  async function decide(action: "APPROVED" | "REJECTED") {
    const trimmed = comment.trim();
    if (action === "REJECTED" && trimmed.length < REJECT_REASON_MIN) {
      setCommentError(true);
      return;
    }
    setCommentError(false);
    setPending(action === "APPROVED" ? "approve" : "reject");
    try {
      await reviewValidation("honor", validation.entity_id, {
        action,
        ...(trimmed ? { comment: trimmed } : {}),
      });
      toast.success(
        action === "APPROVED"
          ? t("approvedToast", { honor: honorName, member })
          : t("rejectedToast", { honor: honorName }),
      );
      onResolved(validation);
      onClose();
    } catch (error) {
      toastError({
        title: error instanceof ApiError && error.message ? error.message : t("decideError"),
        onRetry: () => void decide(action),
      });
    } finally {
      setPending(null);
    }
  }

  const submitted = validation.submitted_at ? formatDate(validation.submitted_at) : null;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{t("title", { honor: honorName, member })}</SheetTitle>
        <SheetDescription>
          {submitted ? t("submittedOn", { date: submitted }) : t("submittedUnknown")}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4">
        {detail.isPending && (
          <div className="space-y-2" role="status" aria-busy="true" aria-label={t("loading")}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {detail.isError && (
          <ErrorState
            variant="inline"
            kind={errorStateFromError(detail.error).kind}
            title={t("detailError")}
            onRetry={() => void detail.refetch()}
          />
        )}

        {detail.data && (
          <HonorProgress detail={detail.data} locale={locale} labels={{ t, tEvidence }} />
        )}

        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
            <History aria-hidden="true" />
            {showHistory ? t("hideHistory") : t("showHistory")}
          </Button>
          {showHistory && (
            <div className="mt-3">
              <ValidationHistoryList entityType="honor" entityId={validation.entity_id} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={commentId}>{t("commentLabel")}</Label>
          <Textarea
            id={commentId}
            rows={3}
            maxLength={REVIEW_COMMENT_MAX}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              if (commentError) setCommentError(false);
            }}
            placeholder={t("commentPlaceholder")}
            aria-invalid={commentError || undefined}
            aria-describedby={`${commentId}-hint`}
            disabled={pending !== null}
          />
          <p
            id={`${commentId}-hint`}
            role={commentError ? "alert" : undefined}
            className={commentError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
          >
            {commentError ? t("reasonRequired", { min: REJECT_REASON_MIN }) : t("commentHint")}
          </p>
        </div>
      </div>

      <SheetFooter className="flex-row justify-end border-t">
        <Button
          type="button"
          variant="outline"
          disabled={pending !== null}
          loading={pending === "reject"}
          onClick={() => void decide("REJECTED")}
        >
          {t("reject")}
        </Button>
        <Button
          type="button"
          disabled={pending !== null}
          loading={pending === "approve"}
          onClick={() => void decide("APPROVED")}
        >
          {t("approve")}
        </Button>
      </SheetFooter>
    </>
  );
}

function HonorProgress({
  detail,
  locale,
  labels,
}: {
  detail: EvidenceDetail;
  locale: string;
  labels: {
    t: ReturnType<typeof useTranslations<"queues.classes.pending.sheet">>;
    tEvidence: ReturnType<typeof useTranslations<"evidence_review.detail">>;
  };
}) {
  const { t, tEvidence } = labels;
  const packet = detail.honor_review_packet;
  const requirements = packet?.requirements ?? [];
  const done = packet?.progress.completed_count ?? 0;
  const total = packet?.progress.total_requirements ?? 0;
  const incomplete = packet !== undefined && total > 0 && done < total;

  let completed = tEvidence("completed_none");
  if (detail.completed_at) completed = formatCalendarDate(detail.completed_at, locale, "long");
  else if (detail.validated_at) {
    completed = tEvidence("completed_approximate", {
      date: formatCalendarDate(detail.validated_at, locale, "long"),
    });
  }

  return (
    <>
      {packet && (
        <section aria-labelledby="honor-progress-title" className="space-y-2">
          <h3 id="honor-progress-title" className="font-medium text-sm">
            {t("progress", { done, total })}
          </h3>
          {incomplete && <p className="text-sm text-warning">{t("incomplete", { missing: total - done })}</p>}
          {requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRequirements")}</p>
          ) : (
            <ul className="space-y-1.5">
              {requirements.map((requirement) => (
                <li key={requirement.requirement_id} className="flex items-start gap-2 text-sm">
                  {requirement.completed ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label={t("met")} />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={t("notMet")} />
                  )}
                  <span className={requirement.completed ? undefined : "text-muted-foreground"}>
                    {requirement.requirement_text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{tEvidence("meta_instructor")}</dt>
        <dd data-testid="honor-instructor">
          {detail.instructor ? (
            <>
              {detail.instructor.display_name}
              <span className="text-muted-foreground">
                {" · "}
                {detail.instructor.kind === "USER"
                  ? tEvidence("instructor_kind_user")
                  : tEvidence("instructor_kind_external")}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{tEvidence("instructor_none")}</span>
          )}
        </dd>
        <dt className="text-muted-foreground">{tEvidence("meta_completed_at")}</dt>
        <dd data-testid="honor-completed-at">{completed}</dd>
      </dl>
    </>
  );
}
