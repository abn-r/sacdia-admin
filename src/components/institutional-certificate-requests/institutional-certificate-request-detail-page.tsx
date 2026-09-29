"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { PdfInlineViewer } from "@/components/shared/pdf-inline-viewer";
import { InstitutionalRequestStatusBadge } from "@/components/institutional-certificate-requests/institutional-certificate-request-badges";
import { InstitutionalCertificateRequestActionDialog } from "@/components/institutional-certificate-requests/institutional-certificate-request-action-dialog";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import {
  getCertificateBulkImportFileDownloadUrl,
  type FileDownloadUrl,
} from "@/lib/api/certificate-bulk-imports";
import type { InstitutionalCertificateRequest } from "@/lib/api/institutional-certificate-requests";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const civil = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = civil
    ? new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

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
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; data: FileDownloadUrl }
  >({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ phase: "loading" });

    getCertificateBulkImportFileDownloadUrl(batchId, fileId)
      .then((data) => {
        if (!cancelled) setState({ phase: "ready", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : tLabels("proofError");
          setState({ phase: "error", message: msg });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, fileId]);

  if (state.phase === "loading") {
    return (
      <Card className="min-h-[320px]">
        <CardContent className="flex min-h-[320px] items-center justify-center">
          <p className="text-sm text-muted-foreground">{tLabels("proofLoading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (state.phase === "error") {
    return (
      <Card className="min-h-[320px]">
        <CardContent className="flex min-h-[320px] items-center justify-center">
          <EmptyState
            icon={AlertCircle}
            title={tLabels("proofNotAvailable")}
            description={state.message}
            variant="no-results"
          />
        </CardContent>
      </Card>
    );
  }

  const { download_url } = state.data;
  const name = fileName ?? "Comprobante";
  const isImage = isImageFileName(name) || isImageUrl(download_url);
  const isPdf = isPdfUrl(download_url);

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="truncate text-base">{name}</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <a href={download_url} target="_blank" rel="noreferrer">
              {tLabels("openProof")}
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex min-h-[320px] items-center justify-center bg-muted/40 p-4">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={download_url}
              alt={name}
              className="max-h-[60vh] rounded-lg border bg-background object-contain shadow-xs"
            />
          ) : isPdf ? (
            <PdfInlineViewer
              title={name}
              src={download_url}
              className="h-[60vh] w-full rounded-lg border bg-background"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <ImageIcon aria-hidden="true" />
              <p className="text-sm">Vista previa no disponible para este tipo de archivo.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

type DialogAction = "approve" | "reject" | null;

export function InstitutionalCertificateRequestDetailPage({
  request,
  listHref = "/dashboard/institutional-certificate-requests",
}: {
  request: InstitutionalCertificateRequest;
  listHref?: string;
}) {
  const router = useRouter();
  const tLabels = useTranslations("institutional_certificate_requests.labels");
  const tDialog = useTranslations("institutional_certificate_requests.actionDialog");
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
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={listHref}>
          <ArrowLeft aria-hidden="true" />
          Volver a bandeja institucional
        </Link>
      </Button>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        {/* Proof viewer */}
        {request.batch_id ? (
          <SignedProofViewer
            batchId={request.batch_id}
            fileId={request.file_id}
          />
        ) : (
          <Card className="min-h-[320px]">
            <CardContent className="flex min-h-[320px] items-center justify-center">
              <EmptyState
                icon={FileText}
                title={tLabels("proofNotAvailable")}
                description="El comprobante no puede mostrarse porque la solicitud no incluye el lote de origen."
                variant="no-results"
              />
            </CardContent>
          </Card>
        )}

        {/* Detail panel */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-xl">{request.applicant_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    ID {request.request_id.slice(0, 8).toUpperCase()} · Rev. {request.revision}
                  </p>
                </div>
                <InstitutionalRequestStatusBadge status={request.status} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Core data grid */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <DataItem label={tLabels("class")} value={request.class_name} />
                <DataItem
                  label={tLabels("assetCode")}
                  value={<Badge variant="outline">{request.asset_code}</Badge>}
                />
                <DataItem
                  label={tLabels("certificateDate")}
                  value={formatDate(request.completed_at)}
                />
                {request.reviewed_at && (
                  <DataItem
                    label={tLabels("reviewedAt")}
                    value={formatDateTime(request.reviewed_at)}
                  />
                )}
              </dl>

              {/* enrollment_created note — always false for this queue */}
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium">{tLabels("enrollmentCreated")}: </span>
                {tLabels("enrollmentCreatedNo")}
              </div>

              {/* Approval blockers — system issue, not applicant's fault */}
              {request.approval_blockers?.length > 0 && (
                <div className="rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 dark:bg-amber-950/20">
                  <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                    {tLabels("approvalBlockers")}
                  </div>
                  <p className="mb-2 text-xs text-amber-700/80 dark:text-amber-400/80">
                    {tLabels("approvalBlockersNote")}
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    {request.approval_blockers.map((blocker) => (
                      <li key={blocker} className="text-xs font-mono text-amber-800 dark:text-amber-300">
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Decision reason */}
              {request.decision_reason && (
                <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  <span className="font-medium">{tLabels("decisionReason")}: </span>
                  {request.decision_reason}
                </div>
              )}

              <Separator />

              {/* Action buttons — only for pending + authorized users */}
              {isPending && (canApprove || canReject) && (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {canReject && (
                    <Button
                      variant="outline"
                      onClick={() => setDialogAction("reject")}
                    >
                      <XCircle aria-hidden="true" />
                      Rechazar
                    </Button>
                  )}
                  {canApprove && (
                    <Button onClick={() => setDialogAction("approve")}>
                      <CheckCircle2 aria-hidden="true" />
                      Aprobar validación
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{tLabels("events")}</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tLabels("noEvents")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {events.map((event) => (
                    <div
                      key={event.event_id}
                      className="rounded-xl border bg-card p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="outline">{event.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(event.created_at)} · Rev. {event.revision}
                        </span>
                      </div>
                      {event.comment && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {event.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action dialog */}
      {dialogAction && (
        <InstitutionalCertificateRequestActionDialog
          open
          action={dialogAction}
          requestId={request.request_id}
          currentRevision={request.revision}
          title={
            dialogAction === "approve"
              ? tDialog("approve")
              : tDialog("reject")
          }
          description={
            dialogAction === "approve"
              ? `Confirmar validación institucional para ${request.applicant_name} — ${request.class_name} (${request.asset_code}). La aprobación NO crea una inscripción de clase.`
              : `Rechazar la solicitud de validación de ${request.applicant_name}.`
          }
          onOpenChange={(open) => !open && setDialogAction(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function DataItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
