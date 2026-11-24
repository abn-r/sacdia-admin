"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PdfInlineViewer } from "@/components/shared/pdf-inline-viewer";
import { PageCountText } from "@/components/certificate-bulk-imports/certificate-bulk-import-review-parts";
import { useFormatDateTime } from "@/lib/format-locale";
import {
  getCertificateBulkImportFileDownloadUrl,
  type CertificateBulkImportFile,
  type FileDownloadUrl,
} from "@/lib/api/certificate-bulk-imports";

export type ProofViewerTarget = { fileId: string; page: number; navigationKey: string };

function isImage(file: CertificateBulkImportFile) {
  return file.file_type.toLowerCase().startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.file_name);
}

function isPdf(file: CertificateBulkImportFile) {
  return file.file_type.toLowerCase().includes("pdf") || /\.pdf$/i.test(file.file_name);
}

type DownloadState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ready"; data: FileDownloadUrl };

/**
 * Voucher of the batch. Fetches a signed URL per file (evidence is private, no
 * public fallback) and opens PDFs on the page the selected row came from.
 */
export function CertificateBatchProof({
  files,
  target,
  onSelectFile,
}: {
  files: CertificateBulkImportFile[];
  target: ProofViewerTarget | null;
  onSelectFile: (fileId: string) => void;
}) {
  const t = useTranslations("queues.certificates.batch.proof");
  const tFiles = useTranslations("certificate_bulk_imports.filesPanel");
  const formatDateTime = useFormatDateTime();
  const file = files.find((f) => f.file_id === target?.fileId) ?? files[0];
  // The result is keyed by what it was fetched for: anything else reads as "loading".
  const [result, setResult] = useState<{ key: string; state: Exclude<DownloadState, { phase: "loading" }> } | null>(null);
  const [tick, setTick] = useState(0);
  const batchId = file?.batch_id;
  const fileId = file?.file_id;
  const key = `${batchId}|${fileId}|${tick}`;
  const state: DownloadState = result?.key === key ? result.state : { phase: "loading" };

  useEffect(() => {
    if (!batchId || !fileId) return;
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

  if (!file) {
    return <EmptyState icon={FileText} title={tFiles("emptyTitle")} description={tFiles("emptyDescription")} />;
  }

  const page = target && target.fileId === file.file_id ? target.page : 1;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{file.file_name}</p>
          <p className="text-muted-foreground text-xs">
            {t("uploaded", { date: formatDateTime(file.uploaded_at) })}
            {typeof file.page_count === "number" && file.page_count >= 1 && (
              <>
                {" · "}
                <PageCountText count={file.page_count} />
              </>
            )}
          </p>
        </div>
        {state.phase === "ready" && (
          <Button variant="outline" size="sm" asChild>
            <a href={state.data.download_url} target="_blank" rel="noreferrer">
              {t("open")}
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>

      {state.phase === "loading" ? (
        <Skeleton className="h-[60vh] w-full rounded-lg" aria-label={t("loading")} />
      ) : state.phase === "error" ? (
        <ErrorState
          variant="inline"
          icon={FileText}
          title={t("unavailable")}
          description={t("unavailableHint")}
          onRetry={() => setTick((n) => n + 1)}
        />
      ) : isImage(file) ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned download_url (expiring signature would defeat the optimizer cache)
        <img
          src={state.data.download_url}
          alt={file.file_name}
          className="max-h-[60vh] w-full rounded-lg border bg-background object-contain"
        />
      ) : isPdf(file) ? (
        <PdfInlineViewer
          title={file.file_name}
          src={state.data.download_url}
          initialPage={page}
          navigationKey={target?.navigationKey ?? ""}
          className="h-[60vh] w-full rounded-lg border bg-background"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-muted/40 p-8 text-center text-muted-foreground">
          <ImageIcon aria-hidden="true" />
          <p className="text-sm">{t("noPreview")}</p>
        </div>
      )}

      {files.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pt-1">
          {files.map((f) => (
            <Button
              key={f.file_id}
              type="button"
              variant={f.file_id === file.file_id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectFile(f.file_id)}
            >
              {f.file_name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
