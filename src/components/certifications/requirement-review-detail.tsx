"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { useFormatDateTime } from "@/lib/format-locale";
import {
  approveRequirement,
  getRequirementDetail,
  getRequirementEvidenceDownload,
  requestRequirementChanges,
  type RequirementReviewDetail as Detail,
  type ReviewComponentView,
} from "@/lib/api/certification-reviews";
import { getCertificationReviewErrorMessage } from "@/components/certifications/certification-review-errors";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";

type Props = {
  progressId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

type ReviewTranslator = ReturnType<typeof useTranslations<"certification_reviews">>;

/** Translated enum value; unknown values (a newer API) show as-is instead of a missing-key error. */
function enumLabel(
  t: ReviewTranslator,
  group: "componentType" | "reviewEvents",
  value: string,
): string {
  const key = `${group}.${value}` as Parameters<ReviewTranslator["has"]>[0];
  return t.has(key) ? t(key as Parameters<ReviewTranslator>[0]) : value;
}

function renderResponse(
  component: ReviewComponentView,
  t: ReturnType<typeof useTranslations<"certification_reviews">>,
) {
  if (component.component_type === "FILE_EVIDENCE" && component.evidences.length > 0) return null;
  if (!component.response) {
    return <p className="text-muted-foreground text-sm">{t("detail.noResponse")}</p>;
  }

  const { response } = component;

  switch (component.component_type) {
    case "TEXT_RESPONSE":
    case "TEXT":
    case "LONG_TEXT":
      return (
        <p className="whitespace-pre-wrap text-sm">{response.text_value || "—"}</p>
      );
    case "ATTESTATION":
      return (
        <p className="text-sm">
          {response.attestation_confirmed
            ? t("detail.attestationYes")
            : t("detail.attestationNo")}
        </p>
      );
    case "LINKED_HONOR":
    case "HONOR_LINK":
      return (
        <p className="text-sm">
          {response.linked_user_honor_id != null
            ? t("detail.linkedHonor", { id: response.linked_user_honor_id })
            : t("detail.noResponse")}
        </p>
      );
    case "LINKED_ACTIVITY":
    case "ACTIVITY_LINK":
      return (
        <p className="text-sm">
          {response.linked_activity_id != null
            ? t("detail.linkedActivity", { id: response.linked_activity_id })
            : t("detail.noResponse")}
        </p>
      );
    default:
      return (
        <p className="whitespace-pre-wrap text-sm">
          {response.text_value ??
            (response.attestation_confirmed != null
              ? String(response.attestation_confirmed)
              : "—")}
        </p>
      );
  }
}

export function RequirementReviewDetail({
  progressId,
  open,
  onOpenChange,
  onChanged,
}: Props) {
  const t = useTranslations("certification_reviews");
  const { canCapability } = useScreenAccess();
  const canApprove = canCapability("certifications-reviews", "approve");
  const canRequestChanges = canCapability(
    "certifications-reviews",
    "request_changes",
  );
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [loadFailure, setLoadFailure] = useState<ErrorStateFromError | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const formatDateTime = useFormatDateTime();

  useEffect(() => {
    if (!open || progressId == null) {
      setDetail(null);
      setComment("");
      setLoadFailure(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadFailure(null);
    void getRequirementDetail(progressId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((error) => {
        // The failure stays visible inside the sheet (with retry), never as an empty sheet.
        if (!cancelled) setLoadFailure(errorStateFromError(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, progressId, reloadTick]);

  const canAct = detail?.status === "SUBMITTED";
  const commentTrimmed = comment.trim();

  async function handleApprove() {
    if (!detail || !canAct) return;
    setSubmitting(true);
    try {
      await approveRequirement(detail.progress_id, detail.lock_version);
      toast.success(t("toasts.approved"));
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toast.error(getCertificationReviewErrorMessage(error, t));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestChanges() {
    if (!detail || !canAct) return;
    if (!commentTrimmed) {
      toast.error(t("detail.commentRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await requestRequirementChanges(
        detail.progress_id,
        detail.lock_version,
        commentTrimmed,
      );
      toast.success(t("toasts.changesRequested"));
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toast.error(getCertificationReviewErrorMessage(error, t));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewEvidence(evidenceId: number) {
    if (!detail) return;
    setDownloadingId(evidenceId);
    try {
      const result = await getRequirementEvidenceDownload(
        detail.progress_id,
        evidenceId,
      );
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        getCertificationReviewErrorMessage(error, t, "toasts.downloadFailed"),
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail ? detail.section_name : t("detail.title")}</SheetTitle>
          <SheetDescription>
            {detail
              ? `${[detail.participant.name, detail.participant.paternal_last_name].filter(Boolean).join(" ")} · ${detail.certification_name} · ${detail.module_name}`
              : null}
          </SheetDescription>
        </SheetHeader>

        {loadFailure ? (
          <ErrorState
            {...loadFailure}
            variant="inline"
            title={t("toasts.detailFailed")}
            onRetry={() => setReloadTick((n) => n + 1)}
            className="mx-4 mt-4"
          />
        ) : loading || !detail ? (
          <div className="space-y-3 px-4 py-4" aria-busy="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 px-1 py-4">
            <ExceptionStatus
              value={detail.status}
              normal={["SUBMITTED"]}
              labels={{
                DRAFT: t("status.DRAFT"),
                SUBMITTED: t("status.SUBMITTED"),
                CHANGES_REQUESTED: t("status.CHANGES_REQUESTED"),
                APPROVED: t("status.APPROVED"),
              }}
              intents={{ APPROVED: "success", CHANGES_REQUESTED: "warning", DRAFT: "neutral" }}
            />

            <section className="space-y-3">
              <h3 className="font-medium text-sm">{t("detail.components")}</h3>
              {detail.components.map((component) => (
                <div
                  key={component.component_id}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{component.label}</p>
                    <Badge variant="outline" className="shrink-0">
                      {enumLabel(t, "componentType", component.component_type)}
                      {component.required ? " *" : ""}
                    </Badge>
                  </div>
                  {renderResponse(component, t)}
                  {component.evidences.length > 0 && (
                    <ul className="space-y-1">
                      {component.evidences.map((evidence) => (
                        <li
                          key={evidence.evidence_id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate">
                            {evidence.original_filename}
                          </span>
                          <Button
                            loading={downloadingId === evidence.evidence_id}
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`${t("detail.viewEvidence")} ${evidence.original_filename}`}
                            onClick={() =>
                              void handleViewEvidence(evidence.evidence_id)
                            }
                          >
                            <ExternalLink className="size-3.5" />
                            {t("detail.viewEvidence")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h3 className="font-medium text-sm">{t("detail.history")}</h3>
              {detail.history.length === 0 ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : (
                <ol className="space-y-2 border-l pl-3">
                  {detail.history.map((entry) => (
                    <li key={entry.review_event_id} className="space-y-0.5 text-sm">
                      <p className="font-medium">{enumLabel(t, "reviewEvents", entry.event_type)}</p>
                      {entry.comment ? (
                        <p className="text-muted-foreground">{entry.comment}</p>
                      ) : null}
                      <p className="text-muted-foreground text-xs">
                        {formatDateTime(entry.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {!canAct ? (
              <p className="text-muted-foreground text-sm">
                {t("detail.actionsDisabled")}
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="requirement-review-comment">
                  {t("detail.commentLabel")}
                </Label>
                <Textarea
                  id="requirement-review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t("detail.commentPlaceholder")}
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        <SheetFooter className="gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("detail.close")}
          </Button>
          <div className="flex flex-wrap gap-2">
            {canRequestChanges ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!canAct || submitting || !commentTrimmed}
              onClick={() => void handleRequestChanges()}
            >
              {t("detail.requestChanges")}
            </Button>
            ) : null}
            {canApprove ? (
            <Button
              type="button"
              disabled={!canAct || submitting}
              onClick={() => void handleApprove()}
            >
              {t("detail.approve")}
            </Button>
            ) : null}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
