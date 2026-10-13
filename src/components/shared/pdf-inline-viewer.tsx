"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface PdfInlineViewerProps {
  src: string;
  title: string;
  className?: string;
  /** 1-based page to open on. Invalid values (< 1, non-integer) are ignored. */
  initialPage?: number;
  /** Change it to jump to `initialPage` again after the user scrolled away. */
  navigationKey?: number | string;
}

/**
 * PDF open parameter understood by the browser PDF viewers (`#page=N`, 1-based).
 * Invalid pages (< 1, non-integer, NaN) leave the URL untouched.
 */
export function buildPdfViewerUrl(blobUrl: string, page?: number): string {
  return typeof page === "number" && Number.isInteger(page) && page >= 1
    ? `${blobUrl}#page=${page}`
    : blobUrl;
}

export function PdfInlineViewer({
  src,
  title,
  className,
  initialPage,
  navigationKey,
}: PdfInlineViewerProps) {
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
        // Sources are presigned R2 URLs fetched straight from the browser.
        // R2 CORS does not send Access-Control-Allow-Credentials, so
        // credentials must stay same-origin or the request is blocked.
        const response = await fetch(src, {
          credentials: "same-origin",
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

  const viewerUrl = buildPdfViewerUrl(blobUrl, initialPage);

  // A plain <iframe> (no <object> wrapper, no nested fallback frame) is a full
  // navigation to `viewerUrl`, so the browser PDF viewer parses `#page=N` as
  // part of that load. The key carries the URL and the navigation counter: any
  // new target discards the frame and loads a fresh document instead of
  // mutating a live viewer, which cannot be told to jump afterwards.
  return (
    <iframe
      key={`${viewerUrl}|${navigationKey ?? ""}`}
      data-testid="pdf-inline-viewer"
      src={viewerUrl}
      title={title}
      className={`bg-background ${viewerClassName}`}
    />
  );
}
