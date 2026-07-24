"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface PdfEvidenceViewerProps {
  fileUrl: string;
  fileName: string;
  zoom: number;
}

async function fetchPdfBlob(fileUrl: string, fileName: string): Promise<Blob> {
  const response = await fetch("/api/annual-folders/evidence/pdf", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/pdf",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: fileUrl,
      name: fileName,
    }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "No se pudo cargar el PDF");
    }
    throw new Error(`No se pudo cargar el PDF (${response.status})`);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("El archivo PDF está vacío");
  }

  if (blob.type.includes("pdf") || blob.type === "application/octet-stream") {
    return blob;
  }

  return new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
}

export function PdfEvidenceViewer({
  fileUrl,
  fileName,
  zoom,
}: PdfEvidenceViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      setBlobUrl(null);

      try {
        const blob = await fetchPdfBlob(fileUrl, fileName);
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setBlobUrl(objectUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el PDF",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileName, fileUrl]);

  const viewerHeight = useMemo(
    () => `${Math.round(72 * zoom)}vh`,
    [zoom],
  );

  if (loading) {
    return (
      <div className="flex h-[55vh] items-center justify-center gap-2 bg-muted/30 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando PDF…
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex h-[55vh] flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-sm font-medium">No se pudo cargar el PDF.</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {error ?? "No se pudo cargar el PDF"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[24rem] flex-1 overflow-auto bg-muted/30 p-4">
      <object
        data-testid="pdf-evidence-viewer"
        data={blobUrl}
        type="application/pdf"
        title={fileName}
        className="w-full rounded-md border bg-background shadow-sm"
        style={{ height: viewerHeight }}
      >
        <iframe
          title={fileName}
          src={blobUrl}
          className="w-full rounded-md border bg-background"
          style={{ height: viewerHeight }}
        />
      </object>
    </div>
  );
}
