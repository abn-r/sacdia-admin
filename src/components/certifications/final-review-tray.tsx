"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ClipboardCheck, ExternalLink, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  approveCloseoutEvidence,
  certify,
  getCloseoutEvidenceDownload,
  getFinalTray,
  requestCloseoutChanges,
  type FinalTrayItem,
} from "@/lib/api/certification-reviews";
import { CERTIFICATIONS_CERTIFY } from "@/lib/auth/permissions";
import { usePermissions } from "@/lib/auth/use-permissions";
import { getCertificationReviewErrorMessage } from "@/components/certifications/certification-review-errors";

function participantName(item: FinalTrayItem) {
  return [item.participant.name, item.participant.paternal_last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || item.participant.user_id;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusIntent(status: string): StatusIntent {
  switch (status) {
    case "APPROVED":
      return "success";
    case "SUBMITTED_FOR_FINAL_REVIEW":
      return "info";
    case "CHANGES_REQUESTED":
      return "warning";
    case "CERTIFIED":
      return "primary";
    default:
      return "neutral";
  }
}

function enrollmentStatusLabel(
  status: string,
  t: ReturnType<typeof useTranslations<"certification_reviews">>,
) {
  switch (status) {
    case "SUBMITTED_FOR_FINAL_REVIEW":
      return t("enrollmentStatus.SUBMITTED_FOR_FINAL_REVIEW");
    case "APPROVED":
      return t("enrollmentStatus.APPROVED");
    case "CHANGES_REQUESTED":
      return t("enrollmentStatus.CHANGES_REQUESTED");
    case "CERTIFIED":
      return t("enrollmentStatus.CERTIFIED");
    default:
      return status;
  }
}

export function FinalReviewTray() {
  const t = useTranslations("certification_reviews");
  const { can } = usePermissions();
  const canCertify = can(CERTIFICATIONS_CERTIFY);

  const [items, setItems] = useState<FinalTrayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [returnTarget, setReturnTarget] = useState<FinalTrayItem | null>(null);
  const [returnComment, setReturnComment] = useState("");
  const [certifyTarget, setCertifyTarget] = useState<FinalTrayItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFinalTray();
      setItems(data);
    } catch (error) {
      toast.error(getCertificationReviewErrorMessage(error, t, "toasts.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleViewEvidence(enrollmentId: number, filename: string) {
    setBusyId(enrollmentId);
    try {
      const result = await getCloseoutEvidenceDownload(enrollmentId);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        getCertificationReviewErrorMessage(error, t, "toasts.downloadFailed"),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(enrollmentId: number) {
    setBusyId(enrollmentId);
    try {
      await approveCloseoutEvidence(enrollmentId);
      toast.success(t("toasts.closeoutApproved"));
      await load();
    } catch (error) {
      toast.error(getCertificationReviewErrorMessage(error, t));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRequestChanges() {
    if (!returnTarget) return;
    const comment = returnComment.trim();
    if (!comment) {
      toast.error(t("final.commentRequired"));
      return;
    }
    setBusyId(returnTarget.enrollment_id);
    try {
      await requestCloseoutChanges(returnTarget.enrollment_id, comment);
      toast.success(t("toasts.closeoutChangesRequested"));
      setReturnTarget(null);
      setReturnComment("");
      await load();
    } catch (error) {
      toast.error(getCertificationReviewErrorMessage(error, t));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCertify() {
    if (!certifyTarget) return;
    setBusyId(certifyTarget.enrollment_id);
    try {
      await certify(certifyTarget.enrollment_id);
      toast.success(t("toasts.certified"));
      setCertifyTarget(null);
      await load();
    } catch (error) {
      toast.error(getCertificationReviewErrorMessage(error, t));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("tray.refresh")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("final.loading")}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("final.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("final.colParticipant")}</th>
                <th className="px-3 py-2 font-medium">{t("final.colCertification")}</th>
                <th className="px-3 py-2 font-medium">{t("final.colStatus")}</th>
                <th className="px-3 py-2 font-medium">{t("final.colSubmitted")}</th>
                <th className="px-3 py-2 font-medium">{t("final.colEvidence")}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSubmitted =
                  item.status === "SUBMITTED_FOR_FINAL_REVIEW";
                const isApproved = item.status === "APPROVED";
                const evidenceName =
                  item.closeout_evidence?.original_filename ?? "—";

                return (
                  <tr key={item.enrollment_id} className="border-t">
                    <td className="px-3 py-2">{participantName(item)}</td>
                    <td className="px-3 py-2">{item.certification_name}</td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        intent={statusIntent(item.status)}
                        label={enrollmentStatusLabel(item.status, t)}
                        size="sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(item.submitted_at)}
                    </td>
                    <td className="px-3 py-2">
                      {item.closeout_evidence ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`${t("final.viewEvidence")} ${evidenceName}`}
                          disabled={busyId === item.enrollment_id}
                          onClick={() =>
                            void handleViewEvidence(
                              item.enrollment_id,
                              evidenceName,
                            )
                          }
                        >
                          {busyId === item.enrollment_id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="size-3.5" />
                          )}
                          {t("final.viewEvidence")}
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        {isSubmitted ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={busyId === item.enrollment_id}
                              onClick={() => {
                                setReturnComment("");
                                setReturnTarget(item);
                              }}
                            >
                              {t("final.requestChanges")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyId === item.enrollment_id}
                              onClick={() =>
                                void handleApprove(item.enrollment_id)
                              }
                            >
                              {t("final.approveEvidence")}
                            </Button>
                          </>
                        ) : null}
                        {isApproved && canCertify ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === item.enrollment_id}
                            onClick={() => setCertifyTarget(item)}
                          >
                            {t("final.certify")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={returnTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setReturnTarget(null);
            setReturnComment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("final.requestChanges")}</DialogTitle>
            <DialogDescription>
              {returnTarget
                ? `${participantName(returnTarget)} · ${returnTarget.certification_name}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="closeout-return-comment">
              {t("final.commentLabel")}
            </Label>
            <Textarea
              id="closeout-return-comment"
              value={returnComment}
              onChange={(event) => setReturnComment(event.target.value)}
              placeholder={t("final.commentPlaceholder")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReturnTarget(null);
                setReturnComment("");
              }}
            >
              {t("final.certifyCancel")}
            </Button>
            <Button
              type="button"
              disabled={!returnComment.trim() || busyId != null}
              onClick={() => void handleRequestChanges()}
            >
              {t("final.requestChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={certifyTarget != null}
        onOpenChange={(open) => {
          if (!open) setCertifyTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("final.certifyConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("final.certifyConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCertifyTarget(null)}
            >
              {t("final.certifyCancel")}
            </Button>
            <Button
              type="button"
              disabled={busyId != null}
              onClick={() => void handleCertify()}
            >
              {t("final.certifyConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
