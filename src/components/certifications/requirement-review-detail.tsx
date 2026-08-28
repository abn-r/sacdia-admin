"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";

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
import { StatusBadge } from "@/components/ui/status-badge";
import {
  approveRequirement,
  getRequirementDetail,
  getRequirementEvidenceDownload,
  requestRequirementChanges,
  type RequirementReviewDetail as Detail,
  type ReviewComponentView,
} from "@/lib/api/certification-reviews";
import { getCertificationReviewErrorMessage } from "@/components/certifications/certification-review-errors";

type Props = {
  progressId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

function renderResponse(
  component: ReviewComponentView,
  t: ReturnType<typeof useTranslations<"certification_reviews">>,
) {
  if (!component.response) {
    return <p className="text-muted-foreground text-sm">{t("detail.noResponse")}</p>;
  }

  const { response } = component;

  switch (component.component_type) {
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
    case "HONOR_LINK":
      return (
        <p className="text-sm">
          {response.linked_user_honor_id != null
            ? t("detail.linkedHonor", { id: response.linked_user_honor_id })
            : t("detail.noResponse")}
        </p>
      );
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
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || progressId == null) {
      setDetail(null);
      setComment("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getRequirementDetail(progressId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            getCertificationReviewErrorMessage(error, t, "toasts.detailFailed"),
          );
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, progressId, onOpenChange, t]);

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
          <SheetTitle>{t("detail.title")}</SheetTitle>
          <SheetDescription>
            {detail
              ? `${detail.certification_name} · ${detail.section_name}`
              : null}
          </SheetDescription>
        </SheetHeader>

        {loading || !detail ? (
          <div className="flex flex-1 items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 px-1 py-4">
            <div className="flex items-center gap-2">
              <StatusBadge
                intent={
                  detail.status === "SUBMITTED"
                    ? "info"
                    : detail.status === "APPROVED"
                      ? "success"
                      : detail.status === "CHANGES_REQUESTED"
                        ? "warning"
                        : "neutral"
                }
                label={t(`status.${detail.status}`)}
                size="sm"
              />
            </div>

            <section className="space-y-3">
              <h3 className="font-medium text-sm">{t("detail.components")}</h3>
              {detail.components.map((component) => (
                <div
                  key={component.component_id}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{component.label}</p>
                    <span className="text-muted-foreground text-xs">
                      {component.component_type}
                      {component.required ? " *" : ""}
                    </span>
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
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`${t("detail.viewEvidence")} ${evidence.original_filename}`}
                            disabled={downloadingId === evidence.evidence_id}
                            onClick={() =>
                              void handleViewEvidence(evidence.evidence_id)
                            }
                          >
                            {downloadingId === evidence.evidence_id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ExternalLink className="size-3.5" />
                            )}
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
                      <p className="font-medium">{entry.event_type}</p>
                      {entry.comment ? (
                        <p className="text-muted-foreground">{entry.comment}</p>
                      ) : null}
                      <p className="text-muted-foreground text-xs">
                        {new Date(entry.created_at).toLocaleString()}
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
            <Button
              type="button"
              variant="secondary"
              disabled={!canAct || submitting || !commentTrimmed}
              onClick={() => void handleRequestChanges()}
            >
              {t("detail.requestChanges")}
            </Button>
            <Button
              type="button"
              disabled={!canAct || submitting}
              onClick={() => void handleApprove()}
            >
              {t("detail.approve")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
