"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UsersBulkReviewTable } from "@/components/users/users-bulk-review-table";
import { UsersBulkResultTable } from "@/components/users/users-bulk-result-table";
import { ApiError } from "@/lib/api/client";
import {
  bulkUploadAdminUsersFromClient,
  type BulkUserRowResult,
  type BulkUsersResult,
} from "@/lib/api/admin-users";
import { decodeCsv, isCsvFile } from "@/lib/clubs/bulk-import-parse";
import { ASSIGNABLE_GLOBAL_ROLE_ORDER } from "@/lib/auth/roles";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { useToastError } from "@/lib/feedback/toast-retry";
import {
  BULK_REVIEW_MAX_BYTES,
  BULK_REVIEW_MAX_ROWS,
  BULK_TEMPLATE_HEADERS,
  reviewBulkUsers,
  summarizeBulkReview,
  type BulkReviewContext,
  type BulkReviewRow,
} from "@/lib/users/bulk-review";
import { BULK_XLSX_MIME, buildBulkSendPlan, mapBulkResultRows } from "@/lib/users/bulk-send";
import { buildBulkTemplateSheets } from "@/lib/users/bulk-template";
import type { BulkUploadData } from "@/lib/users/bulk-upload-data";
import { cn } from "@/lib/utils";

type Phase =
  | { phase: "file" }
  | { phase: "review"; fileName: string; rows: BulkReviewRow[]; uploadError?: string }
  | { phase: "sending"; fileName: string; rows: BulkReviewRow[] }
  | { phase: "result"; fileName: string; data: BulkUsersResult; skipped: number };

type BulkT = ReturnType<typeof useTranslations<"people.users.bulk">>;

function hasXlsxExtension(file: File): boolean {
  return /\.(xlsx|csv)$/i.test(file.name);
}

function StepLine({ t, current, file }: { t: BulkT; current: 1 | 2 | 3; file?: string }) {
  const name = t(current === 1 ? "steps.file" : current === 2 ? "steps.review" : "steps.result");
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      <span className="font-medium text-foreground">{t("stepLine", { current, name })}</span>
      {file ? <span> · {file}</span> : null}
    </p>
  );
}

export function BulkUploadClient({ allowedRoles, localFieldRequiredRoles, catalogs }: BulkUploadData) {
  const t = useTranslations("people.users.bulk");
  const tOld = useTranslations("users.pages.bulk");
  const router = useRouter();
  const toastError = useToastError();
  const getRoleLabel = useRoleLabel();

  const [state, setState] = useState<Phase>({ phase: "file" });
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx = useMemo<BulkReviewContext>(
    () => ({
      allowedRoles,
      localFieldRequiredRoles,
      catalogs,
      roleLabels: Object.fromEntries(ASSIGNABLE_GLOBAL_ROLE_ORDER.map((slug) => [slug, getRoleLabel(slug)])),
    }),
    [allowedRoles, localFieldRequiredRoles, catalogs, getRoleLabel],
  );

  const processFile = useCallback(
    async (file: File) => {
      setFileError(null);
      if (!hasXlsxExtension(file)) return setFileError(t("fileErrors.type"));
      if (file.size > BULK_REVIEW_MAX_BYTES) return setFileError(t("fileErrors.size"));

      setReading(true);
      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        // SheetJS reads CSV bytes as Latin-1, which breaks UTF-8 accents.
        const workbook = isCsvFile(file)
          ? XLSX.read(decodeCsv(buffer), { type: "string" })
          : XLSX.read(buffer, { type: "array", cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
        if (!sheet) return setFileError(t("fileErrors.empty"));
        // Blank rows are kept so row numbers match what the person sees.
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: "",
          blankrows: true,
        });
        const review = reviewBulkUsers(matrix, ctx);
        if (!review.ok) {
          if (review.reason === "missing-headers") {
            return setFileError(t("fileErrors.headers", { missing: review.missing.join(", ") }));
          }
          if (review.reason === "too-many-rows") {
            return setFileError(
              t("fileErrors.tooMany", { total: review.total, max: BULK_REVIEW_MAX_ROWS }),
            );
          }
          return setFileError(t("fileErrors.empty"));
        }
        setState({ phase: "review", fileName: file.name, rows: review.rows });
      } catch (error) {
        console.error("[bulk-upload] could not read the file", error);
        setFileError(t("fileErrors.read"));
      } finally {
        setReading(false);
      }
    },
    [ctx, t],
  );

  async function downloadTemplate() {
    setDownloading(true);
    try {
      const XLSX = await import("xlsx");
      const sheets = buildBulkTemplateSheets(ctx, {
        rolesHeader: [t("template.roleSlug"), t("template.roleLabel"), t("template.needsLocalField")],
        yes: t("template.yes"),
        locationsHeader: [t("template.country"), t("template.union"), t("template.localField")],
        sheetUsers: t("template.sheetUsers"),
        sheetRoles: t("template.sheetRoles"),
        sheetLocations: t("template.sheetLocations"),
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheets.users), t("template.sheetUsers"));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheets.roles), t("template.sheetRoles"));
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(sheets.locations),
        t("template.sheetLocations"),
      );
      XLSX.writeFile(workbook, "plantilla-usuarios.xlsx");
    } catch {
      toastError({ title: t("template.failed"), onRetry: () => void downloadTemplate() });
    } finally {
      setDownloading(false);
    }
  }

  const send = useCallback(
    async (fileName: string, rows: BulkReviewRow[]) => {
      const plan = buildBulkSendPlan(rows);
      const skipped = rows.length - plan.sourceRows.length;
      setState({ phase: "sending", fileName, rows });
      try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(plan.matrix), "Usuarios");
        const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
        const file = new File([bytes], "usuarios.xlsx", { type: BULK_XLSX_MIME });

        const data = await bulkUploadAdminUsersFromClient(file);
        const results: BulkUserRowResult[] = mapBulkResultRows(data.results, plan.sourceRows);
        setState({ phase: "result", fileName, data: { ...data, results }, skipped });
        router.refresh();
      } catch (error) {
        const message =
          error instanceof ApiError && error.status === 403
            ? t("sendErrors.forbidden")
            : error instanceof ApiError && error.status === 413
              ? t("fileErrors.size")
              : t("sendErrors.generic");
        // Back to the review, with the reason on screen.
        setState({ phase: "review", fileName, rows, uploadError: message });
        toast.error(message);
      }
    },
    [router, t],
  );

  function reset() {
    setState({ phase: "file" });
    setFileError(null);
  }

  // ── File ────────────────────────────────────────────────────────────────────
  if (state.phase === "file") {
    return (
      <div className="space-y-4">
        <StepLine t={t} current={1} />
        <div
          role="region"
          aria-label={t("file.dropTitle")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void processFile(file);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-4 rounded-xl border bg-card px-6 py-12 text-center shadow-card transition-colors",
            dragging && "bg-primary/10",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("file.dropTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("file.dropHint", { max: BULK_REVIEW_MAX_ROWS })}</p>
          </div>
          <Button type="button" loading={reading} onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet aria-hidden="true" />
            {reading ? t("file.reading") : t("file.choose")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            aria-label={t("file.choose")}
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void processFile(file);
              // Lets the same file be chosen again.
              e.target.value = "";
            }}
          />
        </div>

        {fileError ? (
          <Alert variant="destructive">
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" loading={downloading} onClick={() => void downloadTemplate()}>
            <Download aria-hidden="true" />
            {tOld("downloadTemplate")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("file.templateHint", { columns: BULK_TEMPLATE_HEADERS.join(", ") })}
          </p>
        </div>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (state.phase === "result") {
    const { data, skipped, fileName } = state;
    return (
      <div className="space-y-4">
        <StepLine t={t} current={3} file={fileName} />
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted px-3.5 py-3 text-sm">
          <b className="font-semibold">{t("result.summary", { succeeded: data.succeeded, failed: data.failed })}</b>
          {skipped > 0 ? (
            <span className="text-muted-foreground">{t("result.skipped", { count: skipped })}</span>
          ) : null}
        </div>
        <UsersBulkResultTable results={data.results} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={reset}>
            {tOld("actions.uploadAnother")}
          </Button>
          <Button asChild>
            <Link href="/dashboard/users">{t("result.backToUsers")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Review (also shown while sending) ───────────────────────────────────────
  const { rows, fileName } = state;
  const uploadError = state.phase === "review" ? state.uploadError : undefined;
  const sending = state.phase === "sending";
  const summary = summarizeBulkReview(rows);

  return (
    <div className="space-y-4">
      <StepLine t={t} current={2} file={fileName} />
      <div className="flex flex-col gap-0.5 rounded-lg bg-muted px-3.5 py-3 text-sm">
        <b className="font-semibold">
          {t("review.summary", { total: summary.total, ready: summary.ready, errors: summary.withErrors })}
        </b>
        <span className="text-muted-foreground">{t("review.note", { max: BULK_REVIEW_MAX_ROWS })}</span>
      </div>

      <UsersBulkReviewTable rows={rows} roleLabel={getRoleLabel} />

      {summary.withErrors > 0 && summary.ready > 0 ? (
        <p className="text-sm text-muted-foreground">{t("review.skipNote", { count: summary.withErrors })}</p>
      ) : null}
      {uploadError ? (
        <Alert variant="destructive">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={reset} disabled={sending}>
          {t("review.chooseAnother")}
        </Button>
        <Button
          type="button"
          loading={sending}
          disabled={summary.ready === 0}
          onClick={() => void send(fileName, rows)}
        >
          {sending ? t("review.sending") : t("review.submit", { count: summary.ready })}
        </Button>
      </div>
    </div>
  );
}
