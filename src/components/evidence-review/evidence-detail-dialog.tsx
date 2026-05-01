"use client";

import { useState, useEffect } from "react";
import {
  FileImage,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { getEvidenceDetail, type EvidenceDetail, type EvidenceType } from "@/lib/api/evidence-review";
import { EvidenceStatusBadge } from "@/components/evidence-review/evidence-status-badge";
import { EvidenceTypeBadge } from "@/components/evidence-review/evidence-type-badge";
import { ApiError } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function isImageFile(fileType: string, fileUrl: string): boolean {
  const imageTypes = ["image", "image/jpeg", "image/png", "image/webp", "image/gif"];
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

// ─── File card ────────────────────────────────────────────────────────────────

interface FileCardProps {
  file: EvidenceDetail["files"][number];
  index: number;
}

function FileCard({ file, index }: FileCardProps) {
  const isImage = isImageFile(file.file_type, file.file_url);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/30">
      {isImage ? (
        <a
          href={file.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.file_url}
            alt={file.file_name || `Evidencia ${index + 1}`}
            className="h-40 w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
            <ExternalLink className="size-6 text-white drop-shadow" />
          </div>
        </a>
      ) : (
        <a
          href={file.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-40 flex-col items-center justify-center gap-2 p-4 text-center hover:bg-muted/50"
        >
          <FileText className="size-10 text-muted-foreground" />
          <span className="text-xs text-muted-foreground line-clamp-2">
            {file.file_name || `Archivo ${index + 1}`}
          </span>
        </a>
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
            {file.file_name || `Archivo ${index + 1}`}
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
  const [detail, setDetail] = useState<EvidenceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
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
  }, [open, type, id]);

  return (
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
                  <p className="text-xs text-muted-foreground">Miembro</p>
                  <p className="font-medium">{detail.member_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <div className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Sección / Honor</p>
                  <p className="font-medium">{detail.section_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Enviado el</p>
                  <p>{formatDate(detail.submitted_at)}</p>
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
                  <p className="mt-0.5 text-destructive/80">{detail.rejection_reason}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Files */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Archivos adjuntos
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {detail.file_count} {detail.file_count === 1 ? "archivo" : "archivos"}
                </Badge>
              </div>

              {detail.files.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin archivos adjuntos
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {detail.files.map((file, idx) => (
                    <FileCard key={file.evidence_file_id} file={file} index={idx} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
