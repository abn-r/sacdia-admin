"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileText } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { PdfInlineViewer } from "@/components/shared/pdf-inline-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  getEvidenceDetail,
  type EvidenceDetail,
  type EvidenceFile,
  type EvidenceItem,
} from "@/lib/api/evidence-review";
import { getEvidenceContextLabel } from "@/lib/evidence-review/display";
import { formatCalendarDate, useFormatDate } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

function isImage(file: EvidenceFile): boolean {
  if (file.file_type.toLowerCase().startsWith("image")) return true;
  return /\.(jpe?g|png|webp|gif)(?:$|[?#])/i.test(file.file_url);
}

function isPdf(file: EvidenceFile): boolean {
  if (file.file_type.toLowerCase().includes("pdf")) return true;
  return /\.pdf(?:$|[?#\s])/i.test(`${file.file_name} ${file.file_url}`);
}

function FileViewer({ file, title }: { file: EvidenceFile; title: string }) {
  const t = useTranslations("queues.classes.evidence.preview");
  if (isImage(file)) {
    return (
      <div className="flex max-h-[60vh] min-h-64 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
        {/* eslint-disable-next-line @next/next/no-img-element -- presigned URL from the backend */}
        <img src={file.file_url} alt={file.file_name || title} className="max-h-[60vh] w-full object-contain" />
      </div>
    );
  }
  if (isPdf(file)) {
    return <PdfInlineViewer title={file.file_name || title} src={file.file_url} className="h-[60vh] w-full" />;
  }
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 p-6 text-center">
      <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{t("unsupported")}</p>
      <Button asChild variant="outline" size="sm">
        <a href={file.file_url} download>
          <Download aria-hidden="true" />
          {t("download")}
        </a>
      </Button>
    </div>
  );
}

/** Header, file strip and large preview of the selected evidence. */
export function EvidencePreview({ item }: { item: EvidenceItem }) {
  const t = useTranslations("queues.classes.evidence.preview");
  const tDetail = useTranslations("evidence_review.detail");
  const tType = useTranslations("evidence_review.typeBadge");
  const locale = useLocale();
  const formatDate = useFormatDate();
  const [fileIndex, setFileIndex] = useState(0);

  const query = useQuery<EvidenceDetail>({
    queryKey: ["evidence-detail", item.type, item.id],
    queryFn: () => getEvidenceDetail(item.type, item.id),
    staleTime: 60_000,
  });

  const files = query.data?.files ?? [];
  const current = files[Math.min(fileIndex, Math.max(files.length - 1, 0))];
  const packet = query.data?.honor_review_packet;

  let completed: string | null = null;
  if (item.type === "honor" && query.data) {
    completed = query.data.completed_at
      ? formatCalendarDate(query.data.completed_at, locale, "long")
      : null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-base">{item.member_name}</h3>
          <p className="text-[13px] text-muted-foreground">
            {tType(item.type)} · {getEvidenceContextLabel(item)}
            {item.submitted_at ? ` · ${t("submittedOn", { date: formatDate(item.submitted_at) })}` : ""}
          </p>
          {item.type === "honor" && query.data && (
            <p className="text-[13px] text-muted-foreground">
              {tDetail("meta_instructor")}:{" "}
              {query.data.instructor ? query.data.instructor.display_name : tDetail("instructor_none")}
              {completed ? ` · ${tDetail("meta_completed_at")}: ${completed}` : ""}
              {packet
                ? ` · ${t("requirements", {
                    done: packet.progress.completed_count,
                    total: packet.progress.total_requirements,
                  })}`
                : ""}
            </p>
          )}
        </div>
        {files.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-2 text-xs tabular-nums leading-5">
            {t("fileOf", { current: Math.min(fileIndex, files.length - 1) + 1, total: files.length })}
          </span>
        )}
      </div>

      {query.isPending && (
        <div role="status" aria-busy="true" aria-label={t("loading")}>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {query.isError && (
        <ErrorState
          variant="inline"
          kind={errorStateFromError(query.error).kind}
          title={t("loadError")}
          onRetry={() => void query.refetch()}
        />
      )}

      {query.data && files.length === 0 && (
        <p className="rounded-lg bg-muted/40 p-6 text-center text-sm text-muted-foreground">{t("noFiles")}</p>
      )}

      {files.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("files")}>
          {files.map((file, index) => (
            <button
              key={file.evidence_file_id}
              type="button"
              aria-pressed={index === fileIndex}
              onClick={() => setFileIndex(index)}
              className={cn(
                "max-w-40 truncate rounded-md border px-2.5 py-1 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                index === fileIndex ? "border-primary bg-primary-soft text-primary-soft-foreground" : "hover:bg-muted/50",
              )}
            >
              {file.file_name || t("fileN", { n: index + 1 })}
            </button>
          ))}
        </div>
      )}

      {current && <FileViewer key={current.evidence_file_id} file={current} title={item.member_name} />}
    </div>
  );
}
