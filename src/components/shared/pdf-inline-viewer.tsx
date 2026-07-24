"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface PdfInlineViewerProps {
  src: string;
  title: string;
  className?: string;
}

export function PdfInlineViewer({ src, title, className }: PdfInlineViewerProps) {
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
        const response = await fetch(src, {
          credentials: "include",
          cache: "no-store",
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

        const pdfBlob =
          blob.type.includes("pdf") || blob.type === "application/octet-stream"
            ? blob
            : new Blob([await blob.arrayBuffer()], { type: "application/pdf" });

        objectUrl = URL.createObjectURL(pdfBlob);
        if (!cancelled) {
          setBlobUrl(objectUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el PDF");
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
  }, [src]);

  const viewerClassName = className ?? "h-[70vh] w-full";

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 ${viewerClassName}`}
        aria-busy="true"
        aria-label="Cargando PDF"
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center ${viewerClassName}`}
      >
        <AlertCircle className="size-8 text-destructive" />
        <p className="max-w-md text-sm text-destructive">
          {error ?? "No se pudo cargar el PDF"}
        </p>
      </div>
    );
  }

  return (
    <object
      data-testid="pdf-inline-viewer"
      data={blobUrl}
      type="application/pdf"
      title={title}
      className={`bg-background ${viewerClassName}`}
    >
      <iframe title={title} src={blobUrl} className={viewerClassName} />
    </object>
  );
}
