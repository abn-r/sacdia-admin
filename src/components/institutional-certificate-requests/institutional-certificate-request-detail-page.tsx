"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ExternalLink,
  FileText,
  ImageIcon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailHeader } from "@/components/shared/detail-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PdfInlineViewer } from "@/components/shared/pdf-inline-viewer";
import { InstitutionalCertificateRequestActionDialog } from "@/components/institutional-certificate-requests/institutional-certificate-request-action-dialog";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import {
  getCertificateBulkImportFileDownloadUrl,
  type FileDownloadUrl,
} from "@/lib/api/certificate-bulk-imports";
import { useFormatDate, useFormatDateTime } from "@/lib/format-locale";
import type { InstitutionalCertificateRequest } from "@/lib/api/institutional-certificate-requests";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isImageFileName(name: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(name);
}

function isImageUrl(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  return /\.(png|jpe?g|webp|gif)$/i.test(path);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url) || url.includes("application/pdf");
}

// ─── Signed Proof Viewer ──────────────────────────────────────────────────────

/**
 * Fetches and renders a signed download URL for a private evidence file.
 * Uses the batch_id + file_id to request the signed URL.
 * Does NOT fall back to a public file_url — evidence files are private.
 */
function SignedProofViewer({
  batchId,
  fileId,
  fileName,
}: {
  batchId: string;
  fileId: string;
  fileName?: string | null;
}) {
  const tLabels = useTranslations("institutional_certificate_requests.labels");
  type Loaded = { phase: "error" } | { phase: "ready"; data: FileDownloadUrl };
  // The result is keyed by what it was fetched for: anything else reads as "loading".
  const [result, setResult] = useState<{ key: string; state: Loaded } | null>(null);
  const [tick, setTick] = useState(0);
  const key = `${batchId}|${fileId}|${tick}`;
  const state: { phase: "loading" } | Loaded = result?.key === key ? result.state : { phase: "loading" };

  useEffect(() => {
    let cancelled = false;
    getCertificateBulkImportFileDownloadUrl(batchId, fileId)
      .then((data) => {
        if (!cancelled) setResult({ key, state: { phase: "ready", data } });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, state: { phase: "error" } });
      });
    return () => {
      cancelled = true;
    };
  }, [batchId, fileId, key]);

  if (state.phase === "loading") {
    return <Skeleton className="h-[70vh] w-full rounded-lg" aria-label={tLabels("proofLoading")} />;
  }

  if (state.phase === "error") {
    return (
      <ErrorState
        variant="inline"
        icon={FileText}
        title={tLabels("proofNotAvailable")}
        description={tLabels("proofError")}
        onRetry={() => setTick((n) => n + 1)}
      />
    );
  }

  const { download_url } = state.data;
  const name = fileName ?? tLabels("proof");
  const isImage = isImageFileName(name) || isImageUrl(download_url);
  const isPdf = isPdfUrl(download_url);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-medium text-sm">{name}</p>
        <Button variant="outline" size="sm" asChild>
          <a href={download_url} target="_blank" rel="noreferrer">
            {tLabels("openProof")}
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </div>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned download_url (expiring signature would defeat the optimizer cache)
        <img
          src={download_url}
          alt={name}
          className="max-h-[70vh] w-full rounded-lg border bg-background object-contain"
        />
      ) : isPdf ? (
        <PdfInlineViewer
          title={name}
          src={download_url}
          className="h-[70vh] w-full rounded-lg border bg-background"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-muted/40 p-8 text-center text-muted-foreground">
          <ImageIcon aria-hidden="true" />
          <p className="text-sm">{tLabels("previewUnavailable")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────────

type DialogAction = "approve" | "reject" | null;

/**
 * Detail: voucher on the left; data, the explained system block and the history
 * on the right. The decisions live in the header.
 */
export function InstitutionalCertificateRequestDetailPage({
  request,
  breadcrumbs,
}: {
  request: InstitutionalCertificateRequest;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  const router = useRouter();
  const tLabels = useTranslations("institutional_certificate_requests.labels");
  const tDialog = useTranslations("institutional_certificate_requests.actionDialog");
  const tStatus = useTranslations("institutional_certificate_requests.status");
  const tGm = useTranslations("queues.certificates.gm");
  const formatDateValue = useFormatDate();
  const formatDateTimeValue = useFormatDateTime();
  const { canCapability } = useScreenAccess();
  const canApprove = canCapability("institutional-certificate-requests", "approve");
  const canReject = canCapability("institutional-certificate-requests", "reject");

  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const [, startTransition] = useTransition();

  const isPending = request.status === "PENDING_REVIEW";
  const events = request.events ?? [];

  function handleSuccess() {
    setDialogAction(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        {...(breadcrumbs ? { breadcrumbs } : {})}
        title={`${request.applicant_name} · ${request.class_name}`}
        subtitle={tGm("detailSubtitle", {
          code: request.asset_code,
          date: request.completed_at ? formatDateValue(request.completed_at) : "—",
          revision: request.revision,
        })}
        facts={
          isPending
            ? undefined
            : [{ label: tGm("factStatus"), value: tStatus(request.status) }]
        }
        actions={
          isPending && (canApprove || canReject) ? (
            <>
              {canReject && (
                <Button variant="outline" onClick={() => setDialogAction("reject")}>
                  {tGm("rejectAction")}
                </Button>
              )}
              {canApprove && <Button onClick={() => setDialogAction("approve")}>{tDialog("approve")}</Button>}
            </>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        {request.batch_id ? (
          <SignedProofViewer batchId={request.batch_id} fileId={request.file_id} />
        ) : (
          <EmptyState
            icon={FileText}
            title={tLabels("proofNotAvailable")}
            description={tLabels("proofNoBatch")}
            variant="no-results"
          />
        )}

        <div className="flex min-w-0 flex-col gap-6">
          <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">{tLabels("applicant")}</dt>
            <dd>{request.applicant_name}</dd>
            <dt className="text-muted-foreground">{tLabels("class")}</dt>
            <dd>
              {request.class_name} ({request.asset_code})
            </dd>
            <dt className="text-muted-foreground">{tLabels("certificateDate")}</dt>
            <dd className="tabular-nums">{request.completed_at ? formatDateValue(request.completed_at) : "—"}</dd>
            {request.reviewed_at && (
              <>
                <dt className="text-muted-foreground">{tLabels("reviewedAt")}</dt>
                <dd className="tabular-nums">{formatDateTimeValue(request.reviewed_at)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{tLabels("enrollmentCreated")}</dt>
            <dd>{tGm("enrollmentNone")}</dd>
            {request.decision_reason && (
              <>
                <dt className="text-muted-foreground">{tLabels("decisionReason")}</dt>
                <dd className="whitespace-pre-wrap">{request.decision_reason}</dd>
              </>
            )}
          </dl>

          {/* System block: informative, never red — it is not the applicant's fault. */}
          {request.approval_blockers?.length > 0 && (
            <div role="note" className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{tLabels("approvalBlockers")}</p>
                <p className="text-muted-foreground">{tLabels("approvalBlockersNote")}</p>
                <ul className="list-inside list-disc font-mono text-xs">
                  {request.approval_blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <section className="space-y-3">
            <h2 className="font-medium text-sm">{tLabels("events")}</h2>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm">{tLabels("noEvents")}</p>
            ) : (
              <ol className="ml-2 flex flex-col gap-3 border-l pl-5">
                {events.map((event) => (
                  <li key={event.event_id} className="relative">
                    <span aria-hidden className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-border" />
                    <p className="font-medium text-sm">
                      {tLabels.has(`eventActions.${event.action}` as "eventActions.REQUEST_SUBMITTED")
                        ? tLabels(`eventActions.${event.action}` as "eventActions.REQUEST_SUBMITTED")
                        : event.action}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {tLabels("eventMeta", {
                        date: formatDateTimeValue(event.created_at),
                        revision: event.revision,
                      })}
                    </p>
                    {event.comment && <p className="mt-1 text-muted-foreground text-sm">{event.comment}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {dialogAction && (
        <InstitutionalCertificateRequestActionDialog
          open
          action={dialogAction}
          requestId={request.request_id}
          currentRevision={request.revision}
          title={dialogAction === "approve" ? tDialog("approve") : tDialog("reject")}
          description={
            dialogAction === "approve"
              ? tDialog("approveDescription", {
                  applicant: request.applicant_name,
                  class: request.class_name,
                  code: request.asset_code,
                })
              : tDialog("rejectDescription", { applicant: request.applicant_name })
          }
          onOpenChange={(open) => !open && setDialogAction(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
