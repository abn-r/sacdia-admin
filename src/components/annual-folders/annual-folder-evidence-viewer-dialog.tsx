"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FolderEvidence } from "@/lib/api/annual-folders";

function fileIdentity(evidence: FolderEvidence) {
  return evidence.evidence_id;
}

function fileLabel(evidence: FolderEvidence | null) {
  return evidence?.file_name ?? "Evidencia sin nombre";
}

function fileSearchText(evidence: FolderEvidence | null) {
  return `${evidence?.file_name ?? ""} ${evidence?.file_url ?? ""}`.toLowerCase();
}

function isImageEvidence(evidence: FolderEvidence | null) {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(?:$|[?#\s])/i.test(
    fileSearchText(evidence),
  );
}

function isPdfEvidence(evidence: FolderEvidence | null) {
  return /\.pdf(?:$|[?#\s])/i.test(fileSearchText(evidence));
}

function buildPdfViewerUrl(fileUrl: string, zoom: number) {
  const [baseUrl] = fileUrl.split("#");
  const zoomPct = Math.round(zoom * 100);
  return `${baseUrl}#toolbar=1&navpanes=0&zoom=${zoomPct}`;
}

interface AnnualFolderEvidenceViewerDialogProps {
  evidence: FolderEvidence | null;
  evidences: FolderEvidence[];
  onSelectEvidence: (evidence: FolderEvidence) => void;
  onOpenChange: (open: boolean) => void;
}

export function AnnualFolderEvidenceViewerDialog({
  evidence,
  evidences,
  onSelectEvidence,
  onOpenChange,
}: AnnualFolderEvidenceViewerDialogProps) {
  const [zoom, setZoom] = useState(1);
  const open = evidence != null;
  const files = useMemo(() => {
    if (evidences.length > 0) return evidences;
    return evidence ? [evidence] : [];
  }, [evidence, evidences]);
  const currentIndex = evidence
    ? files.findIndex((item) => fileIdentity(item) === fileIdentity(evidence))
    : -1;
  const isImage = isImageEvidence(evidence);
  const isPdf = isPdfEvidence(evidence);
  const title = isImage ? "Vista de imagen" : isPdf ? "Vista de PDF" : "Evidencia";
  const currentFileLabel = fileLabel(evidence);

  function clampZoom(nextZoom: number) {
    setZoom(Math.min(Math.max(nextZoom, 0.5), 3));
  }

  function selectByOffset(offset: number) {
    if (currentIndex < 0 || files.length <= 1) return;
    const nextIndex = (currentIndex + offset + files.length) % files.length;
    onSelectEvidence(files[nextIndex]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2">
            {title}
            {evidence && (
              <Badge variant="secondary" className="max-w-full truncate text-xs">
                {currentFileLabel}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Revisá la evidencia sin salir del panel. Podés cambiar de archivo y
            ajustar el zoom.
          </DialogDescription>
        </DialogHeader>

        {evidence && (
          <div className="grid max-h-[calc(92vh-7rem)] grid-cols-1 overflow-hidden lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside className="flex gap-2 overflow-x-auto border-b border-border bg-muted/20 p-3 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
              {files.map((file) => {
                const selected = fileIdentity(file) === fileIdentity(evidence);
                return (
                  <button
                    key={fileIdentity(file)}
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelectEvidence(file)}
                    className={`flex min-w-48 max-w-64 shrink-0 items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm lg:min-w-0 lg:max-w-none ${
                      selected ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    {isImageEvidence(file) ? (
                      <FileImage className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 break-all text-xs">
                      {fileLabel(file)}
                    </span>
                  </button>
                );
              })}
            </aside>

            <section className="flex min-h-0 min-w-0 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectByOffset(-1)}
                    disabled={files.length <= 1}
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectByOffset(1)}
                    disabled={files.length <= 1}
                  >
                    Siguiente
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {(isImage || isPdf) && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Alejar"
                        onClick={() => clampZoom(zoom - 0.25)}
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
                        onClick={() => clampZoom(zoom + 0.25)}
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
                    </>
                  )}
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={evidence.file_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Abrir aparte
                    </a>
                  </Button>
                </div>
              </div>

              {isImage && (
                <div className="min-h-[24rem] flex-1 overflow-auto bg-muted/30">
                  <div className="flex min-h-full min-w-full items-start justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={evidence.file_url}
                      alt={currentFileLabel}
                      className="h-auto max-w-none rounded-md border bg-background object-contain shadow-sm transition-[width]"
                      style={{ width: `${Math.round(zoom * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {isPdf && (
                <iframe
                  key={`${evidence.evidence_id}-${zoom}`}
                  title={`Visor PDF: ${currentFileLabel}`}
                  src={buildPdfViewerUrl(evidence.file_url, zoom)}
                  className="h-[72vh] w-full bg-muted"
                />
              )}

              {!isImage && !isPdf && (
                <div className="flex h-[55vh] flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
                  <FileText className="size-10 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Vista previa no disponible para este tipo de archivo.
                  </p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Podés abrirlo aparte o descargarlo para revisarlo con una
                    aplicación compatible.
                  </p>
                  <Button variant="outline" asChild>
                    <a href={evidence.file_url} download>
                      <Download className="size-4" />
                      Descargar
                    </a>
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
