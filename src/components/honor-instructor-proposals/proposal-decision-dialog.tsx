"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HonorInstructorProposal } from "@/lib/api/honor-instructor-proposals";
import {
  getProposalErrorKey,
  isInstructorInvalidError,
  isStaleProposalError,
} from "./honor-instructor-proposal-errors";
import { useHonorInstructorProposalMutations } from "./use-honor-instructor-proposals";

export type ProposalDecision = "approve" | "reject";

export const REASON_MIN = 3;
export const REASON_MAX = 500;

interface ProposalDecisionDialogProps {
  proposal: HonorInstructorProposal;
  action: ProposalDecision;
  onClose: () => void;
}

/**
 * Approve = plain confirmation that repeats the change. Reject = same dialog
 * with a mandatory reason (3-500). If approve answers HONOR_INSTRUCTOR_INVALID
 * the instructor is no longer eligible: the dialog keeps only "Reject".
 * Mount it with a `key` per proposal+action so its state starts clean.
 */
export function ProposalDecisionDialog({ proposal, action, onClose }: ProposalDecisionDialogProps) {
  const t = useTranslations("honor_instructor_proposals");
  const { approve, reject, refresh } = useHonorInstructorProposalMutations();
  const [mode, setMode] = useState<ProposalDecision>(action);
  const [reason, setReason] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const isReject = mode === "reject";
  const isPending = approve.isPending || reject.isPending;
  const proposed = proposal.proposed_instructor.display_name ?? t("instructor.unnamed");
  const current = proposal.current_instructor?.display_name;

  function handleError(error: unknown) {
    const message = t(`errors.${getProposalErrorKey(error)}`);
    if (isStaleProposalError(error)) {
      toast.error(message);
      void refresh();
      onClose();
    } else if (!isReject && isInstructorInvalidError(error)) {
      setInvalid(true);
    } else {
      setInlineError(message);
    }
  }

  async function submit() {
    setInlineError(null);
    try {
      if (isReject) {
        const trimmed = reason.trim();
        if (trimmed.length < REASON_MIN || trimmed.length > REASON_MAX) {
          setInlineError(t("reject.reasonInvalid", { min: REASON_MIN, max: REASON_MAX }));
          return;
        }
        await reject.mutateAsync({ proposalId: proposal.proposal_id, reason: trimmed });
        toast.success(t("toast.rejected"));
      } else {
        await approve.mutateAsync(proposal.proposal_id);
        toast.success(t("toast.approved"));
      }
      onClose();
    } catch (error) {
      handleError(error);
    }
  }

  function switchToReject() {
    setMode("reject");
    setInvalid(false);
    setInlineError(null);
  }

  const description = isReject
    ? t("reject.description", { member: proposal.member?.display_name ?? "", proposed })
    : current
      ? t("approve.replace", { current, proposed })
      : t("approve.assign", { proposed });

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={isReject ? "bg-destructive/10" : "bg-success/10"}>
            {isReject ? (
              <XCircle className="text-destructive" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="text-success" aria-hidden="true" />
            )}
          </AlertDialogMedia>
          <AlertDialogTitle>{isReject ? t("reject.title") : t("approve.title")}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {invalid && (
          <Alert variant="destructive">
            <ShieldAlert aria-hidden="true" />
            <AlertDescription>{t("errors.invalid")}</AlertDescription>
          </Alert>
        )}

        {isReject && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="honor-instructor-reject-reason">{t("reject.reasonLabel")}</Label>
            <Textarea
              id="honor-instructor-reject-reason"
              rows={4}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("reject.reasonPlaceholder")}
              disabled={isPending}
              aria-invalid={inlineError ? true : undefined}
            />
          </div>
        )}

        {inlineError && (
          <Alert variant="destructive" role="alert">
            <ShieldAlert aria-hidden="true" />
            <AlertDescription>{inlineError}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("dialog.cancel")}</AlertDialogCancel>
          {invalid ? (
            <AlertDialogAction
              variant="destructive-solid"
              onClick={(event) => {
                event.preventDefault();
                switchToReject();
              }}
            >
              {t("reject.confirm")}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              variant={isReject ? "destructive-solid" : "default"}
              loading={isPending}
              onClick={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {isReject ? t("reject.confirm") : t("approve.confirm")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
