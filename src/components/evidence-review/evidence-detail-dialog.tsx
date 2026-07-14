"use client";

import { useState, useEffect } from "react";
import {
  FileImage,
  FileText,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
  ListChecks,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  getEvidenceDetail,
  type EvidenceDetail,
  type EvidenceType,
} from "@/lib/api/evidence-review";
import { EvidenceStatusBadge } from "@/components/evidence-review/evidence-status-badge";
import { EvidenceTypeBadge } from "@/components/evidence-review/evidence-type-badge";
import { ApiError } from "@/lib/api/client";
import {
  getEvidenceDescription,
  getEvidenceEntityName,
  getEvidenceSectionName,
} from "@/lib/evidence-review/display";

type HonorReviewPacket = NonNullable<EvidenceDetail["honor_review_packet"]>;
type EvidenceFile = EvidenceDetail["files"][number];

function getHonorCompletionModeCopy(mode: HonorReviewPacket["completion_mode"]) {
  switch (mode) {
    case "EXTERNAL":
      return {
        label: "Fuera de la app",
        description:
          "El miembro completó la especialidad fuera de SACDIA. Validá el formato completado y las evidencias adjuntas.",
        badgeClassName: "bg-warning/15 text-warning-foreground border-warning/30",
        panelClassName: "border-warning/30 bg-warning/10",
      };
    case "IN_APP":
      return {
        label: "Dentro de la app",
        description:
          "El miembro trabajó los requisitos dentro de SACDIA. Revisá respuestas y evidencias por requisito.",
        badgeClassName: "bg-success/15 text-success-foreground border-success/30",
        panelClassName: "border-success/30 bg-success/10",
      };
    case "UNDECIDED":
    default:
      return {
        label: "Sin modo definido",
        description:
          "Este registro no tiene modo de trabajo confirmado. Revisá los archivos disponibles antes de decidir.",
        badgeClassName: "",
        panelClassName: "border-border bg-muted/30",
      };
  }
}

function isImageFile(fileType: string, fileUrl: string): boolean {
  const imageTypes = [
    "image",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  if (imageTypes.some((t) => fileType.toLowerCase().startsWith(t))) return true;
  const urlLower = fileUrl.toLowerCase();
  return (
    urlLower.includes(".jpg") ||
    urlLower.includes(".jpeg") ||
    urlLower.includes(".png") ||
    urlLower.includes(".webp") ||
    urlLower.includes(".gif")
  );
}

function isPdfFile(fileType: string, fileUrl: string, fileName?: string): boolean {
  if (fileType.toLowerCase().includes("pdf")) return true;

  const filePath = `${fileName ?? ""} ${fileUrl}`.toLowerCase();
  return /\.pdf(?:$|[?#\s])/i.test(filePath);
}

function buildPdfViewerUrl(
  type: EvidenceType,
  evidenceId: number,
  fileId: number,
): string {
  const params = new URLSearchParams({
    type,
    id: String(evidenceId),
    fileId: String(fileId),
  });

  return `/api/evidence-review/pdf?${params.toString()}`;
}

// ─── File card ────────────────────────────────────────────────────────────────

interface FileCardProps {
  file: EvidenceFile;
  index: number;
  onOpenViewer: (file: EvidenceFile) => void;
}

function FileCard({ file, index, onOpenViewer }: FileCardProps) {
  const isImage = isImageFile(file.file_type, file.file_url);
  const fileLabel = file.file_name || `Archivo ${index + 1}`;

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/30">
      {isImage ? (
        <button
          type="button"
          aria-label={`Abrir visor de ${fileLabel}`}
          onClick={() => onOpenViewer(file)}
          className="block w-full text-left"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.file_url}
            alt={fileLabel}
            className="h-40 w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
            <ExternalLink className="size-6 text-white drop-shadow" />
          </div>
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Abrir visor de ${fileLabel}`}
          onClick={() => onOpenViewer(file)}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 p-4 text-center hover:bg-muted/50"
        >
          <FileText className="size-10 text-muted-foreground" />
          <span className="text-xs text-muted-foreground line-clamp-2">
            {fileLabel}
          </span>
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border bg-background px-2 py-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isImage ? (
            <FileImage className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <FileText className="size-3 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-xs text-muted-foreground">
            {fileLabel}
          </span>
        </div>
        <a
          href={file.file_url}
          download
          onClick={(e) => e.stopPropagation()}
          className="ml-1 shrink-0 text-muted-foreground hover:text-foreground"
          title="Descargar"
        >
          <Download className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─── In-panel file viewer ────────────────────────────────────────────────────

interface EvidenceFileViewerDialogProps {
  file: EvidenceFile | null;
  evidenceType: EvidenceType;
  evidenceId: number;
  imageFiles: EvidenceFile[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSelectFile: (file: EvidenceFile) => void;
  onOpenChange: (open: boolean) => void;
}

function EvidenceFileViewerDialog({
  file,
  evidenceType,
  evidenceId,
  imageFiles,
  zoom,
  onZoomChange,
  onSelectFile,
  onOpenChange,
}: EvidenceFileViewerDialogProps) {
  const open = file != null;
  const isImage = file ? isImageFile(file.file_type, file.file_url) : false;
  const isPdf = file
    ? isPdfFile(file.file_type, file.file_url, file.file_name)
    : false;
  const selectedImageIndex =
    file && isImage
      ? imageFiles.findIndex((item) => item.evidence_file_id === file.evidence_file_id)
      : -1;
  const canNavigateImages = isImage && imageFiles.length > 1;
  const title = isImage
    ? "Visor de imágenes"
    : isPdf
      ? "Visor PDF"
      : "Archivo adjunto";
  const fileName = file?.file_name || "Archivo adjunto";
  const pdfViewerUrl =
    file && isPdf
      ? buildPdfViewerUrl(evidenceType, evidenceId, file.evidence_file_id)
      : null;

  function setZoom(nextZoom: number) {
    onZoomChange(Math.min(Math.max(nextZoom, 0.5), 3));
  }

  function selectImageByOffset(offset: number) {
    if (!canNavigateImages || selectedImageIndex < 0) return;
    const nextIndex =
      (selectedImageIndex + offset + imageFiles.length) % imageFiles.length;
    onSelectFile(imageFiles[nextIndex]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            {title}
            {file && (
              <Badge variant="secondary" className="max-w-64 truncate text-xs">
                {fileName}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isImage
              ? "Revisa todas las imágenes enviadas y usa zoom sin salir del panel."
              : isPdf
                ? "Revisa el PDF enviado sin abrir una pestaña externa."
                : "Descarga el archivo para revisarlo con una aplicación compatible."}
          </DialogDescription>
        </DialogHeader>

        {file && isImage && (
          <div className="grid max-h-[calc(92vh-7rem)] grid-cols-1 overflow-hidden md:grid-cols-[10rem_1fr]">
            <aside className="flex gap-2 overflow-x-auto border-b border-border bg-muted/20 p-3 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
              {imageFiles.map((imageFile) => {
                const label = imageFile.file_name || "Imagen adjunta";
                const selected =
                  imageFile.evidence_file_id === file.evidence_file_id;
                return (
                  <button
                    key={imageFile.evidence_file_id}
                    type="button"
                    aria-label={`Ver ${label}`}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelectFile(imageFile)}
                    className={`shrink-0 overflow-hidden rounded-md border bg-background ${
                      selected ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageFile.file_url}
                      alt=""
                      className="h-20 w-24 object-cover md:w-full"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </aside>

            <section className="flex min-h-0 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectImageByOffset(-1)}
                    disabled={!canNavigateImages}
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectImageByOffset(1)}
                    disabled={!canNavigateImages}
                  >
                    Siguiente
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Alejar"
                    onClick={() => setZoom(zoom - 0.25)}
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <span className="min-w-12 text-center text-xs font-medium tabular-nums text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Acercar"
                    onClick={() => setZoom(zoom + 0.25)}
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Restablecer zoom"
                    onClick={() => setZoom(1)}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              </div>

              <div
                data-testid="evidence-image-scroll-area"
                className="min-h-[24rem] flex-1 overflow-auto bg-muted/30"
              >
                <div className="flex min-h-full min-w-full items-start justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    data-testid="evidence-viewer-image"
                    src={file.file_url}
                    alt={fileName}
                    className="h-auto max-w-none object-contain transition-[width]"
                    style={{
                      width: `${Math.round(zoom * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {file && !isImage && isPdf && pdfViewerUrl && (
          <div className="flex max-h-[calc(92vh-7rem)] flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
              <p className="truncate text-sm font-medium">{fileName}</p>
              <a
                href={file.file_url}
                download
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Download className="size-4" />
                Descargar
              </a>
            </div>
            <PdfInlineViewer
              title={`Visor PDF: ${fileName}`}
              src={pdfViewerUrl}
              className="h-[70vh] w-full"
            />
          </div>
        )}

        {file && !isImage && !isPdf && (
          <div className="flex max-h-[calc(92vh-7rem)] flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
              <p className="truncate text-sm font-medium">{fileName}</p>
              <a
                href={file.file_url}
                download
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Download className="size-4" />
                Descargar
              </a>
            </div>
            <div className="flex h-[50vh] flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                No hay visor local para este tipo de archivo.
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Descargalo para revisarlo con una aplicación compatible.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Honor review packet ─────────────────────────────────────────────────────

interface HonorReviewPacketSectionProps {
  packet: HonorReviewPacket;
}

function HonorReviewPacketSection({ packet }: HonorReviewPacketSectionProps) {
  const requirements = packet.requirements ?? [];
  const completedCount = packet.progress.completed_count;
  const totalRequirements = packet.progress.total_requirements;
  const progressPercentage = Math.round(packet.progress.progress_percentage);
  const modeCopy = getHonorCompletionModeCopy(packet.completion_mode);

  return (
    <section className="rounded-lg border border-border bg-muted/20 p-4">
      <div
        className={`mb-4 rounded-md border p-3 ${modeCopy.panelClassName}`}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Modo de trabajo
          </p>
          <Badge
            variant="outline"
            className={`text-xs ${modeCopy.badgeClassName}`}
          >
            {modeCopy.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{modeCopy.description}</p>
        {packet.completed_format_file && (
          <p className="mt-2 text-xs text-muted-foreground">
            Formato completado:{" "}
            <span className="font-medium text-foreground">
              {packet.completed_format_file.file_name || "Archivo adjunto"}
            </span>
          </p>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Progreso del honor</h4>
        </div>
        <Badge variant="secondary" className="text-xs">
          {completedCount} de {totalRequirements} requisitos
        </Badge>
      </div>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{packet.honor_name}</span>
          <span>{progressPercentage}% completado</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${Math.min(Math.max(progressPercentage, 0), 100)}%`,
            }}
          />
        </div>
      </div>

      {requirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este honor no tiene requisitos registrados.
        </p>
      ) : (
        <div className="space-y-3">
          {requirements.map((requirement) => (
            <div
              key={requirement.requirement_id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex items-start gap-2">
                {requirement.completed ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {requirement.display_label ?? requirement.requirement_number}
                    </p>
                    <Badge
                      variant={requirement.completed ? "default" : "outline"}
                      className="text-xs"
                    >
                      {requirement.completed ? "Completado" : "Pendiente"}
                    </Badge>
                    {requirement.requires_evidence && (
                      <Badge variant="secondary" className="text-xs">
                        Requiere evidencia
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {requirement.requirement_text}
                  </p>
                  {requirement.text_response && (
                    <div className="mt-2 rounded-md bg-muted/50 p-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Respuesta del miembro
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {requirement.text_response}
                      </p>
                    </div>
                  )}
                  {requirement.evidences.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {requirement.evidences.map((file) => (
                        <a
                          key={file.evidence_file_id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <FileText className="size-3" />
                          Evidencia: {file.file_name || "Archivo adjunto"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EvidenceDetailDialogProps {
  open: boolean;
  type: EvidenceType;
  id: number;
  onOpenChange: (open: boolean) => void;
}

export function EvidenceDetailDialog({
  open,
  type,
  id,
  onOpenChange,
}: EvidenceDetailDialogProps) {
  const t = useTranslations("evidence_review");
  const formatDate = useFormatDateTime();
  const [detail, setDetail] = useState<EvidenceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerFile, setViewerFile] = useState<EvidenceFile | null>(null);
  const [viewerZoom, setViewerZoom] = useState(1);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
      setViewerFile(null);
      setViewerZoom(1);
      return;
    }

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getEvidenceDetail(type, id);
        setDetail(data);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : t("errors.load_detail_failed");
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [open, type, id, t]);

  const imageFiles =
    detail?.files.filter((file) => isImageFile(file.file_type, file.file_url)) ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Detalle de evidencia
              {detail && (
                <>
                  <EvidenceTypeBadge type={detail.type} />
                  <EvidenceStatusBadge status={detail.status} type={detail.type} />
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Revisá los archivos y metadatos de la evidencia enviada por el miembro.
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {detail && !isLoading && (
            <div className="space-y-4">
              {/* Meta info */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 text-sm">
                  <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("detail.meta_member")}</p>
                    <p className="font-medium">{detail.member_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <div className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("detail.meta_entity")}</p>
                    <p className="font-medium">{getEvidenceEntityName(detail)}</p>
                  </div>
                </div>

                {detail.type === "class" && (
                  <div className="flex items-start gap-2 text-sm">
                    <div className="mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("detail.meta_section")}</p>
                      <p className="font-medium">{getEvidenceSectionName(detail)}</p>
                      {detail.module_name && (
                        <p className="text-xs text-muted-foreground">
                          {t("detail.meta_module", { name: detail.module_name })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 text-sm sm:col-span-2">
                  <div className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("detail.meta_description")}</p>
                    <p className="text-sm">{getEvidenceDescription(detail)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("detail.meta_submitted")}</p>
                    <p>
                      {detail.submitted_at ? formatDate(detail.submitted_at) : "—"}
                    </p>
                  </div>
                </div>

                {detail.validated_at && (
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {detail.status === "rechazado" || detail.status === "rejected"
                          ? "Rechazado el"
                          : "Validado el"}
                      </p>
                      <p>{formatDate(detail.validated_at)}</p>
                      {detail.validated_by_name && (
                        <p className="text-xs text-muted-foreground">
                          por {detail.validated_by_name}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Rejection reason */}
              {detail.rejection_reason && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Motivo de rechazo</p>
                    <p className="mt-0.5 text-destructive/80">
                      {detail.rejection_reason}
                    </p>
                  </div>
                </div>
              )}

              {detail.type === "honor" && detail.honor_review_packet && (
                <HonorReviewPacketSection packet={detail.honor_review_packet} />
              )}

              <Separator />

              {/* Files */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Archivos adjuntos</h4>
                  <Badge variant="secondary" className="text-xs">
                    {detail.file_count}{" "}
                    {detail.file_count === 1 ? "archivo" : "archivos"}
                  </Badge>
                </div>

                {detail.files.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Sin archivos adjuntos
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {detail.files.map((file, idx) => (
                      <FileCard
                        key={file.evidence_file_id}
                        file={file}
                        index={idx}
                        onOpenViewer={(selectedFile) => {
                          setViewerFile(selectedFile);
                          setViewerZoom(1);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EvidenceFileViewerDialog
        file={viewerFile}
        evidenceType={type}
        evidenceId={id}
        imageFiles={imageFiles}
        zoom={viewerZoom}
        onZoomChange={setViewerZoom}
        onSelectFile={(selectedFile) => {
          setViewerFile(selectedFile);
          setViewerZoom(1);
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setViewerFile(null);
            setViewerZoom(1);
          }
        }}
      />
    </>
  );
}
