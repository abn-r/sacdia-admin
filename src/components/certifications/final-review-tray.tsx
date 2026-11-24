"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ClipboardCheck, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { useFormatDateTime } from "@/lib/format-locale";
import { useToastError } from "@/lib/feedback/toast-retry";
import {
  approveCloseoutEvidence,
  certify,
  getCloseoutEvidenceDownload,
  getFinalTray,
  requestCloseoutChanges,
  type FinalTrayItem,
} from "@/lib/api/certification-reviews";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { getCertificationReviewErrorMessage } from "@/components/certifications/certification-review-errors";

function participantName(item: FinalTrayItem) {
  return (
    [item.participant.name, item.participant.paternal_last_name].filter(Boolean).join(" ").trim() ||
    item.participant.user_id
  );
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

const KNOWN_STATUSES = ["SUBMITTED_FOR_FINAL_REVIEW", "APPROVED", "CHANGES_REQUESTED", "CERTIFIED"];

/**
 * Final closings use the same table as requirements: "Aprobar comprobante"
 * while submitted, "Certificar" (ConfirmDialog) once the voucher is approved,
 * and "Devolver" asks for a comment.
 */
export function FinalReviewTray({ onCount }: { onCount?: (count: number) => void }) {
  const t = useTranslations("certification_reviews");
  const formatDateTime = useFormatDateTime();
  const toastError = useToastError();
  const { canCapability } = useScreenAccess();
  const canApprove = canCapability("certifications-reviews", "approve");
  const canRequestChanges = canCapability("certifications-reviews", "request_changes");
  const canCertify = canCapability("certifications-reviews", "certify");

  const [items, setItems] = useState<FinalTrayItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ErrorStateFromError | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [returnTarget, setReturnTarget] = useState<FinalTrayItem | null>(null);
  const [certifyTarget, setCertifyTarget] = useState<FinalTrayItem | null>(null);
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFinalTray();
      setItems(data);
      setFailure(null);
      setLoadedAt(new Date());
      onCountRef.current?.(data.length);
    } catch (error) {
      setFailure(errorStateFromError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleViewEvidence(item: FinalTrayItem) {
    setBusyId(item.enrollment_id);
    try {
      const result = await getCloseoutEvidenceDownload(item.enrollment_id);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toastError({
        title: getCertificationReviewErrorMessage(error, t, "toasts.downloadFailed"),
        onRetry: () => void handleViewEvidence(item),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(item: FinalTrayItem) {
    setBusyId(item.enrollment_id);
    try {
      await approveCloseoutEvidence(item.enrollment_id);
      toast.success(t("toasts.closeoutApproved"));
      await load();
    } catch (error) {
      toast.error(getCertificationReviewErrorMessage(error, t));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRequestChanges(comment: string) {
    if (!returnTarget) return;
    setBusyId(returnTarget.enrollment_id);
    try {
      await requestCloseoutChanges(returnTarget.enrollment_id, comment);
      toast.success(t("toasts.closeoutChangesRequested"));
      setReturnTarget(null);
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
      await load();
    } catch (error) {
      // ConfirmDialog keeps itself open and shows this message inline.
      throw new Error(getCertificationReviewErrorMessage(error, t));
    } finally {
      setBusyId(null);
    }
  }

  const colSpan = 5;
  const hasRows = items !== null && items.length > 0;

  return (
    <div className="space-y-4">
      {failure && hasRows && loadedAt && <StaleDataNotice at={loadedAt} onRetry={() => void load()} />}

      {items !== null && items.length === 0 && !failure ? (
        <EmptyState icon={ClipboardCheck} title={t("final.empty")} />
      ) : (
        <DataTableShell aria-busy={loading}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("final.colParticipant")}</TableHead>
                <TableHead>{t("final.colCertification")}</TableHead>
                <TableHead>{t("final.colStatus")}</TableHead>
                <TableHead>{t("final.colSubmitted")}</TableHead>
                <RowActionsHead className="w-64" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items === null && !failure
                ? Array.from({ length: 3 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={colSpan}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {failure && !hasRows ? (
                <ErrorStateTableRow colSpan={colSpan} {...failure} onRetry={() => void load()} />
              ) : null}
              {hasRows
                ? items.map((item) => {
                    const isSubmitted = item.status === "SUBMITTED_FOR_FINAL_REVIEW";
                    const isApproved = item.status === "APPROVED";
                    const busy = busyId === item.enrollment_id;
                    const name = participantName(item);
                    const primary = (
                      <>
                        {isSubmitted && canRequestChanges && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => setReturnTarget(item)}
                          >
                            {t("final.requestChanges")}
                          </Button>
                        )}
                        {isSubmitted && canApprove && (
                          <Button type="button" size="sm" disabled={busy} onClick={() => void handleApprove(item)}>
                            {t("final.approveEvidence")}
                          </Button>
                        )}
                        {isApproved && canCertify && (
                          <Button type="button" size="sm" disabled={busy} onClick={() => setCertifyTarget(item)}>
                            {t("final.certify")}
                          </Button>
                        )}
                      </>
                    );
                    return (
                      <TableRow key={item.enrollment_id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>
                          <div>{item.certification_name}</div>
                          {item.closeout_evidence ? (
                            <div className="text-muted-foreground text-xs">
                              {item.closeout_evidence.original_filename}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            intent={statusIntent(item.status)}
                            label={
                              KNOWN_STATUSES.includes(item.status)
                                ? t(`enrollmentStatus.${item.status as "APPROVED"}`)
                                : item.status
                            }
                            size="sm"
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-sm tabular-nums">
                          {item.submitted_at ? formatDateTime(item.submitted_at) : "—"}
                        </TableCell>
                        <TableCell>
                          <RowActions
                            label={`${name} · ${item.certification_name}`}
                            primary={primary}
                            actions={[
                              {
                                label: t("final.viewEvidence"),
                                icon: ExternalLink,
                                hidden: !item.closeout_evidence,
                                disabled: busy,
                                onSelect: () => void handleViewEvidence(item),
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                : null}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <ReasonDialog
        open={returnTarget != null}
        onOpenChange={(open) => {
          if (!open) setReturnTarget(null);
        }}
        title={t("final.requestChanges")}
        description={returnTarget ? `${participantName(returnTarget)} · ${returnTarget.certification_name}` : undefined}
        label={t("final.commentLabel")}
        placeholder={t("final.commentPlaceholder")}
        min={1}
        confirmLabel={t("final.requestChanges")}
        tone="default"
        pending={busyId != null && returnTarget != null}
        onConfirm={handleRequestChanges}
      />

      <ConfirmDialog
        open={certifyTarget != null}
        onOpenChange={(open) => {
          if (!open) setCertifyTarget(null);
        }}
        title={t("final.certifyConfirmTitle")}
        description={
          certifyTarget
            ? `${participantName(certifyTarget)} · ${certifyTarget.certification_name}. ${t("final.certifyConfirmDescription")}`
            : t("final.certifyConfirmDescription")
        }
        confirmLabel={t("final.certifyConfirm")}
        cancelLabel={t("final.certifyCancel")}
        onConfirm={handleCertify}
      />
    </div>
  );
}
