"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  Info,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PdfInlineViewer } from "@/components/shared/pdf-inline-viewer";
import { CertificateBulkImportActionDialog } from "@/components/certificate-bulk-imports/certificate-bulk-import-action-dialog";
import {
  CertificateBatchStatusBadge,
  CertificateItemStatusBadge,
  CertificateItemTypeBadge,
} from "@/components/certificate-bulk-imports/certificate-bulk-import-badges";
import { CertificateBulkImportProgress } from "@/components/certificate-bulk-imports/certificate-bulk-import-progress";
import {
  confidenceLabel,
  confidencePercent,
  formatCivilDate,
  formatDateTime,
  formatShortId,
  formatUserName,
  getBatchCounts,
  isReviewableItem,
  itemCatalogName,
} from "@/components/certificate-bulk-imports/helpers";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import {
  getCertificateBulkImportFileDownloadUrl,
  type CertificateBulkImportBatch,
  type CertificateBulkImportFile,
  type CertificateBulkImportItem,
  type FileDownloadUrl,
} from "@/lib/api/certificate-bulk-imports";

// ─── GM asset codes ──────────────────────────────────────────────────────────

/** GM-01: Guía Mayor — approving here substitutes the current enrollment with a
 * single INVESTIDO row dated from the certificate. */
const GM01_CODE = "GM-01";

/** GM-02 / GM-03: Advanced / Instructor — NOT approved in Campo Local.
 * These go to the institutional queue (super-admin only). */
const GM_INSTITUTIONAL_CODES = ["GM-02", "GM-03"];

type DialogState =
  | { action: "approve"; item: CertificateBulkImportItem }
  | { action: "reject"; item: CertificateBulkImportItem }
  | null;

function isImage(file: CertificateBulkImportFile) {
  return file.file_type.toLowerCase().startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.file_name);
}

function isPdf(file: CertificateBulkImportFile) {
  return file.file_type.toLowerCase().includes("pdf") || /\.pdf$/i.test(file.file_name);
}

/**
 * Fetches and caches a signed download URL for a single private evidence file.
 * Does NOT fall back to file_url — evidence files are not public.
 */
function SignedFileCardContent({
  file,
}: {
  file: CertificateBulkImportFile;
}) {
  const [downloadState, setDownloadState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; data: FileDownloadUrl }
  >({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    setDownloadState({ phase: "loading" });

    getCertificateBulkImportFileDownloadUrl(file.batch_id, file.file_id)
      .then((data) => {
        if (!cancelled) setDownloadState({ phase: "ready", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "No se pudo obtener el URL firmado del comprobante.";
          setDownloadState({ phase: "error", message: msg });
        }
      });

    return () => { cancelled = true; };
  }, [file.batch_id, file.file_id]);

  if (downloadState.phase === "loading") {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-muted/40">
        <p className="text-sm text-muted-foreground">Cargando comprobante…</p>
      </div>
    );
  }

  if (downloadState.phase === "error") {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-muted/40 p-4">
        <EmptyState
          icon={AlertCircle}
          title="Comprobante no disponible"
          description={downloadState.message}
          variant="no-results"
        />
      </div>
    );
  }

  const { download_url } = downloadState.data;
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{file.file_name}</p>
          <p className="text-xs text-muted-foreground">Subido {formatDateTime(file.uploaded_at)}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={download_url} target="_blank" rel="noreferrer">
            Abrir
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </div>
      <div className="flex min-h-[520px] items-center justify-center bg-muted/40 p-4">
        {isImage(file) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={download_url}
            alt={file.file_name}
            className="max-h-[70vh] rounded-lg border bg-background object-contain shadow-xs"
          />
        ) : isPdf(file) ? (
          <PdfInlineViewer
            title={file.file_name}
            src={download_url}
            className="h-[70vh] w-full rounded-lg border bg-background"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <ImageIcon aria-hidden="true" />
            <p className="text-sm">Vista previa no disponible para este tipo de archivo.</p>
          </div>
        )}
      </div>
    </>
  );
}

function ProofViewer({ files }: { files: CertificateBulkImportFile[] }) {
  const t = useTranslations("certificate_bulk_imports.filesPanel");
  const [activeFileId, setActiveFileId] = useState(files[0]?.file_id ?? "");
  const activeFile = files.find((file) => file.file_id === activeFileId) ?? files[0];

  if (!activeFile) {
    return (
      <Card className="min-h-[520px]">
        <CardContent className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={FileText}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <SignedFileCardContent file={activeFile} />
        {files.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t p-3">
            {files.map((file) => (
              <Button
                key={file.file_id}
                type="button"
                variant={file.file_id === activeFile.file_id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFileId(file.file_id)}
              >
                {file.file_name}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item,
  canApprove,
  canReject,
  onApprove,
  onReject,
}: {
  item: CertificateBulkImportItem;
  canApprove: boolean;
  canReject: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const reviewable = isReviewableItem(item);
  const assetCode = item.class?.asset_code ?? null;
  const isGm01 = assetCode === GM01_CODE;

  return (
    <div className="rounded-xl border bg-card p-3 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CertificateItemTypeBadge type={item.item_type} />
            <CertificateItemStatusBadge status={item.status} />
            <Badge variant="outline">OCR {confidencePercent(item.ocr_confidence)} · {confidenceLabel(item.ocr_confidence)}</Badge>
            {assetCode && (
              <Badge variant="secondary">{assetCode}</Badge>
            )}
          </div>
          <div className="font-medium">{item.detected_name ?? "Sin nombre detectado"}</div>
          <div className="text-sm text-muted-foreground">
            Catálogo: {itemCatalogName(item)}
            {item.completed_at && (
              <> · <span title="Fecha del certificado">Certificado: {formatCivilDate(item.completed_at)}</span></>
            )}
            {item.reviewed_at && (
              <> · <span title="Fecha de revisión">Revisado: {formatDateTime(item.reviewed_at)}</span></>
            )}
          </div>

          {/* GM-01: substitution notice */}
          {isGm01 && (
            <div className="flex items-start gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Al aprobar GM-01, la inscripción actual quedará reemplazada por una sola fila INVESTIDO
                con la fecha del certificado. No se conservan dos inscripciones.
              </span>
            </div>
          )}

          {/* Approval blockers — system issue, NOT the member's fault */}
          {item.approval_blockers && item.approval_blockers.length > 0 && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-50 px-3 py-2 dark:bg-amber-950/20">
              <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                Bloqueos del sistema (no es un error del miembro):
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {item.approval_blockers.map((blocker) => (
                  <li key={blocker} className="text-xs font-mono text-amber-800 dark:text-amber-300">
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.rejection_reason && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Motivo de rechazo: {item.rejection_reason}
            </div>
          )}
        </div>

        {reviewable && (canApprove || canReject) && (
          <div className="flex gap-2 lg:justify-end">
            {canReject && (
              <Button variant="outline" size="sm" onClick={onReject}>
                <XCircle aria-hidden="true" />
                Rechazar
              </Button>
            )}
            {canApprove && (
              <Button size="sm" onClick={onApprove}>
                <CheckCircle2 aria-hidden="true" />
                Aprobar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditTimeline({ batch }: { batch: CertificateBulkImportBatch }) {
  const t = useTranslations("certificate_bulk_imports.auditTimeline");
  const events = batch.events ?? [];
  if (events.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        variant="no-results"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => (
        <div key={event.event_id} className="rounded-xl border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline">{event.action}</Badge>
            <span className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
          </div>
          {event.comment && <p className="mt-2 text-sm text-muted-foreground">{event.comment}</p>}
        </div>
      ))}
    </div>
  );
}

export function CertificateBulkImportDetailPage({
  batch,
  listHref = "/dashboard/certificate-bulk-imports",
}: {
  batch: CertificateBulkImportBatch;
  listHref?: string;
}) {
  const router = useRouter();
  const { canCapability } = useScreenAccess();
  const canApprove = canCapability("certificate-bulk-imports", "approve");
  const canReject = canCapability("certificate-bulk-imports", "reject");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [, startTransition] = useTransition();
  const visibleBatch = useMemo(() => {
    const institutionalIds = new Set(
      (batch.items ?? [])
        .filter((item) =>
          GM_INSTITUTIONAL_CODES.includes(item.class?.asset_code ?? ""),
        )
        .map((item) => item.item_id),
    );
    return {
      ...batch,
      items: (batch.items ?? []).filter(
        (item) => !institutionalIds.has(item.item_id),
      ),
      files: (batch.files ?? []).filter(
        (file) => file.jurisdiction !== "INSTITUTIONAL",
      ),
      events: (batch.events ?? []).filter(
        (event) => !event.item_id || !institutionalIds.has(event.item_id),
      ),
    };
  }, [batch]);
  const items = visibleBatch.items ?? [];
  const files = visibleBatch.files ?? [];
  const counts = useMemo(() => getBatchCounts(visibleBatch), [visibleBatch]);

  function handleSuccess() {
    setDialog(null);
    startTransition(() => router.refresh());
  }

  const dialogTitle = dialog?.action === "approve" ? "Aprobar fila" : "Rechazar fila";
  const dialogDescription = dialog?.action === "approve"
    ? "Solo esta fila se aplicará al perfil del miembro."
    : "Solo esta fila quedará marcada para corrección.";

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={listHref}>
          <ArrowLeft aria-hidden="true" />
          Volver a cargas
        </Link>
      </Button>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <ProofViewer files={files} />

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-xl">{formatUserName(batch.user)}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Lote {formatShortId(batch.batch_id)} · Enviado {formatDateTime(batch.submitted_at)}
                  </p>
                </div>
                <CertificateBatchStatusBadge status={batch.status} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CertificateBulkImportProgress
                approved={counts.approved}
                rejected={counts.rejected}
                pending={counts.pending + counts.needsReview}
                total={counts.total}
                className="max-w-xs"
              />
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="Total" value={counts.total} />
                <Stat label="Aprobadas" value={counts.approved} />
                <Stat label="Rechazadas" value={counts.rejected} />
                <Stat label="Pendientes" value={counts.pending} />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="items">
            <TabsList variant="line">
              <TabsTrigger value="items">Filas · {items.length}</TabsTrigger>
              <TabsTrigger value="audit">Auditoría · {(visibleBatch.events ?? []).length}</TabsTrigger>
            </TabsList>
            <TabsContent value="items" className="flex flex-col gap-2">
              {items.length === 0 ? (
                <EmptyState icon={FileText} title="Sin filas" description="No hay resultados OCR para revisar." />
              ) : (
                items.map((item) => (
                  <ItemRow
                    key={item.item_id}
                    item={item}
                    canApprove={canApprove}
                    canReject={canReject}
                    onApprove={() => setDialog({ action: "approve", item })}
                    onReject={() => setDialog({ action: "reject", item })}
                  />
                ))
              )}
            </TabsContent>
            <TabsContent value="audit">
              <AuditTimeline batch={visibleBatch} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {dialog && (
        <CertificateBulkImportActionDialog
          open={Boolean(dialog)}
          action={dialog.action}
          scope="item"
          batchId={batch.batch_id}
          itemId={dialog.item.item_id}
          title={dialogTitle}
          description={dialogDescription}
          reconciliation={dialog.item.operational_reconciliation}
          onOpenChange={(open) => !open && setDialog(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-3">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
