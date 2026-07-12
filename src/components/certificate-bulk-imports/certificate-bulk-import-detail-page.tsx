"use client";

import { usePanelPath } from "@/lib/v2/panel-path-context";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
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
  formatDateTime,
  formatShortId,
  formatUserName,
  getBatchCounts,
  isReviewableItem,
  itemCatalogName,
} from "@/components/certificate-bulk-imports/helpers";
import type {
  CertificateBulkImportBatch,
  CertificateBulkImportFile,
  CertificateBulkImportItem,
} from "@/lib/api/certificate-bulk-imports";

type DialogState =
  | { action: "approve"; scope: "batch" }
  | { action: "reject"; scope: "batch" }
  | { action: "approve"; scope: "item"; item: CertificateBulkImportItem }
  | { action: "reject"; scope: "item"; item: CertificateBulkImportItem }
  | null;

function isImage(file: CertificateBulkImportFile) {
  return file.file_type.toLowerCase().startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.file_name);
}

function isPdf(file: CertificateBulkImportFile) {
  return file.file_type.toLowerCase().includes("pdf") || /\.pdf$/i.test(file.file_name);
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
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{activeFile.file_name}</CardTitle>
            <p className="text-xs text-muted-foreground">Subido {formatDateTime(activeFile.uploaded_at)}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={activeFile.file_url} target="_blank" rel="noreferrer">
              Abrir
              <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex min-h-[520px] items-center justify-center bg-muted/40 p-4">
          {isImage(activeFile) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeFile.file_url}
              alt={activeFile.file_name}
              className="max-h-[70vh] rounded-lg border bg-background object-contain shadow-xs"
            />
          ) : isPdf(activeFile) ? (
            <iframe
              title={activeFile.file_name}
              src={activeFile.file_url}
              className="h-[70vh] w-full rounded-lg border bg-background"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <ImageIcon aria-hidden="true" />
              <p className="text-sm">Vista previa no disponible para este tipo de archivo.</p>
            </div>
          )}
        </div>
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
  onApprove,
  onReject,
}: {
  item: CertificateBulkImportItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  const reviewable = isReviewableItem(item);

  return (
    <div className="rounded-xl border bg-card p-3 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CertificateItemTypeBadge type={item.item_type} />
            <CertificateItemStatusBadge status={item.status} />
            <Badge variant="outline">OCR {confidencePercent(item.ocr_confidence)} · {confidenceLabel(item.ocr_confidence)}</Badge>
          </div>
          <div className="font-medium">{item.detected_name ?? "Sin nombre detectado"}</div>
          <div className="text-sm text-muted-foreground">
            Catálogo: {itemCatalogName(item)} · Fecha: {formatDateTime(item.detected_date ?? item.completed_at)}
          </div>
          {item.rejection_reason && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Motivo: {item.rejection_reason}
            </div>
          )}
        </div>
        {reviewable && (
          <div className="flex gap-2 lg:justify-end">
            <Button variant="outline" size="sm" onClick={onReject}>
              <XCircle aria-hidden="true" />
              Rechazar
            </Button>
            <Button size="sm" onClick={onApprove}>
              <CheckCircle2 aria-hidden="true" />
              Aprobar
            </Button>
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

export function CertificateBulkImportDetailPage({ batch }: { batch: CertificateBulkImportBatch }) {
  const { toPanelPath } = usePanelPath();

  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [, startTransition] = useTransition();
  const counts = useMemo(() => getBatchCounts(batch), [batch]);
  const files = batch.files ?? [];
  const items = batch.items ?? [];
  const hasReviewableItems = items.some(isReviewableItem);

  function handleSuccess() {
    setDialog(null);
    startTransition(() => router.refresh());
  }

  const dialogTitle = dialog?.scope === "batch"
    ? dialog.action === "approve" ? "Aprobar lote" : "Rechazar lote completo"
    : dialog?.action === "approve" ? "Aprobar fila" : "Rechazar fila";

  const dialogDescription = dialog?.scope === "batch"
    ? dialog.action === "approve"
      ? `Se aprobarán ${counts.pending} filas pendientes. Las rechazadas no se modifican.`
      : "El miembro recibirá el motivo y podrá corregir el lote."
    : dialog?.action === "approve"
      ? "La fila se aplicará al perfil del miembro."
      : "Solo esta fila será marcada para corrección.";

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={toPanelPath("/dashboard/certificate-bulk-imports")}>
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
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  disabled={!hasReviewableItems}
                  onClick={() => setDialog({ action: "reject", scope: "batch" })}
                >
                  <XCircle aria-hidden="true" />
                  Rechazar lote
                </Button>
                <Button
                  disabled={!hasReviewableItems}
                  onClick={() => setDialog({ action: "approve", scope: "batch" })}
                >
                  <CheckCircle2 aria-hidden="true" />
                  Aprobar lote
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="items">
            <TabsList variant="line">
              <TabsTrigger value="items">Filas · {items.length}</TabsTrigger>
              <TabsTrigger value="audit">Auditoría · {(batch.events ?? []).length}</TabsTrigger>
            </TabsList>
            <TabsContent value="items" className="flex flex-col gap-2">
              {items.length === 0 ? (
                <EmptyState icon={FileText} title="Sin filas" description="No hay resultados OCR para revisar." />
              ) : (
                items.map((item) => (
                  <ItemRow
                    key={item.item_id}
                    item={item}
                    onApprove={() => setDialog({ action: "approve", scope: "item", item })}
                    onReject={() => setDialog({ action: "reject", scope: "item", item })}
                  />
                ))
              )}
            </TabsContent>
            <TabsContent value="audit">
              <AuditTimeline batch={batch} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {dialog && (
        <CertificateBulkImportActionDialog
          open={Boolean(dialog)}
          action={dialog.action}
          scope={dialog.scope}
          batchId={batch.batch_id}
          itemId={dialog.scope === "item" ? dialog.item.item_id : undefined}
          title={dialogTitle}
          description={dialogDescription}
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
