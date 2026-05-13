"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, X, CheckCircle2, XCircle, Loader2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import {
  bulkUploadAdminUsersFromClient,
  downloadAdminUsersBulkTemplate,
  type BulkUserRowResult,
  type BulkUsersResult,
} from "@/lib/api/admin-users";

// ─── Error code → human label map ─────────────────────────────────────────────

const ERROR_CODE_LABELS: Record<string, string> = {
  VALIDATION_FAILED: "Datos inválidos",
  DUPLICATE_IN_FILE: "Email duplicado en el archivo",
  EMAIL_ALREADY_IN_USE: "Email ya registrado",
  INVALID_ROLE: "Rol inválido",
  FORBIDDEN_ROLE_FOR_ACTOR: "No podés crear ese rol",
  INTERNAL_ERROR: "Error interno",
};

function resolveErrorLabel(code: string | undefined, message: string | undefined): string {
  if (code && ERROR_CODE_LABELS[code]) {
    return ERROR_CODE_LABELS[code];
  }
  return message ?? code ?? "Error desconocido";
}

// ─── Preview row shape ─────────────────────────────────────────────────────────

type PreviewRow = Record<string, unknown>;

const REQUIRED_HEADERS = ["email"] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 500;
const PREVIEW_ROWS = 5;
const PREVIEW_COLS = ["email", "name", "paternal_last_name", "role"] as const;

// ─── State machine ─────────────────────────────────────────────────────────────

type IdleState = { phase: "idle" };
type PreviewingState = { phase: "previewing"; file: File; rows: PreviewRow[]; total: number };
type UploadingState = { phase: "uploading"; file: File };
type ResultsState = { phase: "results"; data: BulkUsersResult };

type UiState = IdleState | PreviewingState | UploadingState | ResultsState;

type ResultFilter = "all" | "success" | "error";

// ─── Download helper ───────────────────────────────────────────────────────────

async function triggerTemplateDownload() {
  const blob = await downloadAdminUsersBulkTemplate();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "plantilla-usuarios.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ─── File validation ───────────────────────────────────────────────────────────

function isValidExtension(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".csv");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkUploadClient() {
  const t = useTranslations("users.pages.bulk");

  const [state, setState] = useState<UiState>({ phase: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [isDownloading, setIsDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── File processing ─────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!isValidExtension(file)) {
      toast.error(t("toast.fileTypeInvalid"));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(t("toast.fileTooLarge"));
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<PreviewRow>(sheet);

      if (!Array.isArray(json) || json.length === 0) {
        toast.error(t("toast.fileEmpty"));
        return;
      }

      const firstRow = json[0];
      const hasRequiredHeaders = REQUIRED_HEADERS.every((h) => h in firstRow);
      if (!hasRequiredHeaders) {
        toast.error(t("preview.headersInvalid"));
        return;
      }

      if (json.length > MAX_ROWS) {
        toast.error(t("toast.tooManyRows"));
        return;
      }

      setState({
        phase: "previewing",
        file,
        rows: json.slice(0, PREVIEW_ROWS),
        total: json.length,
      });
    } catch {
      toast.error(t("toast.generic"));
    }
  }, [t]);

  // ─── Drag & drop ─────────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) await processFile(file);
    },
    [processFile],
  );

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) await processFile(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [processFile],
  );

  // ─── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (state.phase !== "previewing") return;
    const { file } = state;

    setState({ phase: "uploading", file });

    try {
      const data = await bulkUploadAdminUsersFromClient(file);

      setState({ phase: "results", data });
      setResultFilter("all");

      if (data.failed === 0) {
        toast.success(t("toast.success"));
      } else if (data.succeeded === 0) {
        toast.error(t("toast.allFailed"));
      } else {
        toast.warning(t("toast.partialSuccess"));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          toast.error(err.message || t("toast.generic"));
        } else if (err.status === 403) {
          toast.error("No tenés permisos para esta operación");
        } else if (err.status === 413) {
          toast.error(t("toast.fileTooLarge"));
        } else {
          toast.error(t("toast.generic"));
        }
      } else {
        toast.error(t("toast.generic"));
      }

      // Go back to previewing so user can retry or cancel
      setState({ phase: "previewing", file, rows: state.rows ?? [], total: state.total ?? 0 });
    }
  }, [state, t]);

  // ─── Template download ────────────────────────────────────────────────────────

  const handleDownloadTemplate = useCallback(async () => {
    setIsDownloading(true);
    try {
      await triggerTemplateDownload();
    } catch {
      toast.error(t("toast.generic"));
    } finally {
      setIsDownloading(false);
    }
  }, [t]);

  // ─── Reset ────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setState({ phase: "idle" });
    setResultFilter("all");
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (state.phase === "idle") {
    return <IdleView
      isDragging={isDragging}
      isDownloading={isDownloading}
      inputRef={inputRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onInputChange={handleInputChange}
      onDownloadTemplate={handleDownloadTemplate}
      t={t}
    />;
  }

  if (state.phase === "previewing") {
    return <PreviewView
      file={state.file}
      rows={state.rows}
      total={state.total}
      onSubmit={handleSubmit}
      onCancel={handleReset}
      t={t}
    />;
  }

  if (state.phase === "uploading") {
    return <UploadingView t={t} />;
  }

  // results
  return <ResultsView
    data={state.data}
    filter={resultFilter}
    onFilterChange={setResultFilter}
    onReset={handleReset}
    t={t}
  />;
}

// ─── Idle view ────────────────────────────────────────────────────────────────

interface IdleViewProps {
  isDragging: boolean;
  isDownloading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => Promise<void>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onDownloadTemplate: () => Promise<void>;
  t: ReturnType<typeof useTranslations<"users.pages.bulk">>;
}

function IdleView({
  isDragging,
  isDownloading,
  inputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  onDownloadTemplate,
  t,
}: IdleViewProps) {
  return (
    <div className="space-y-4">
      <div
        role="region"
        aria-label={t("dropZone.title")}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Upload className="size-7 text-primary" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{t("dropZone.title")}</p>
          <p className="text-xs text-muted-foreground">{t("dropZone.subtitle")}</p>
          <p className="text-xs text-muted-foreground">{t("dropZone.accept")}</p>
        </div>

        <label htmlFor="bulk-file-input">
          <span className="cursor-pointer text-xs font-medium text-primary underline-offset-4 hover:underline">
            {t("dropZone.browse")}
          </span>
          <input
            ref={inputRef}
            id="bulk-file-input"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={onInputChange}
          />
        </label>
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadTemplate}
          disabled={isDownloading}
          className="gap-2"
        >
          {isDownloading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {t("downloadTemplate")}
        </Button>
      </div>
    </div>
  );
}

// ─── Preview view ─────────────────────────────────────────────────────────────

interface PreviewViewProps {
  file: File;
  rows: PreviewRow[];
  total: number;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations<"users.pages.bulk">>;
}

function PreviewView({ file, rows, total, onSubmit, onCancel, t }: PreviewViewProps) {
  const extraCols = Object.keys(rows[0] ?? {}).filter((k) => !PREVIEW_COLS.includes(k as typeof PREVIEW_COLS[number]));
  const hasExtra = extraCols.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <FileSpreadsheet className="size-5 text-primary shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("preview.showingRowsOf", { shown: Math.min(rows.length, PREVIEW_ROWS), total })}
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {PREVIEW_COLS.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
              {hasExtra && (
                <TableHead className="text-muted-foreground">
                  +{extraCols.length} {t("preview.moreColumns")}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                {PREVIEW_COLS.map((col) => (
                  <TableCell key={col} className="max-w-[180px] truncate">
                    {row[col] != null ? String(row[col]) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                ))}
                {hasExtra && <TableCell />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > PREVIEW_ROWS && (
        <p className="text-xs text-muted-foreground text-center">
          {t("preview.subtitle")}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button size="sm" onClick={onSubmit}>
          {t("actions.submit")}
        </Button>
      </div>
    </div>
  );
}

// ─── Uploading view ───────────────────────────────────────────────────────────

function UploadingView({ t }: { t: ReturnType<typeof useTranslations<"users.pages.bulk">> }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-muted/30 px-6 py-14">
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{t("actions.submit")}…</p>
    </div>
  );
}

// ─── Results view ─────────────────────────────────────────────────────────────

interface ResultsViewProps {
  data: BulkUsersResult;
  filter: ResultFilter;
  onFilterChange: (f: ResultFilter) => void;
  onReset: () => void;
  t: ReturnType<typeof useTranslations<"users.pages.bulk">>;
}

function ResultsView({ data, filter, onFilterChange, onReset, t }: ResultsViewProps) {
  const filteredRows: BulkUserRowResult[] =
    filter === "all"
      ? data.results
      : data.results.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label={t("results.totalLabel")}
          value={data.total}
          variant="neutral"
        />
        <KpiCard
          label={t("results.succeededLabel")}
          value={data.succeeded}
          variant="success"
        />
        <KpiCard
          label={t("results.failedLabel")}
          value={data.failed}
          variant={data.failed > 0 ? "error" : "neutral"}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "success", "error"] as const).map((f) => {
          const labels: Record<ResultFilter, string> = {
            all: t("actions.filterAll"),
            success: t("actions.filterSuccess"),
            error: t("actions.filterError"),
          };
          return (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => onFilterChange(f)}
            >
              {labels[f]}
            </Button>
          );
        })}
      </div>

      {/* Results table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("results.rowHeader")}</TableHead>
              <TableHead>{t("results.emailHeader")}</TableHead>
              <TableHead>{t("results.statusHeader")}</TableHead>
              <TableHead>{t("results.detailHeader")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Sin resultados para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow key={row.row}>
                  <TableCell className="text-muted-foreground">{row.row}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs">
                    {row.email ?? <span className="text-muted-foreground italic">—</span>}
                  </TableCell>
                  <TableCell>
                    {row.status === "success" ? (
                      <Badge variant="soft-success" className="gap-1">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        {t("statusBadges.success")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="size-3" aria-hidden="true" />
                        {t("statusBadges.error")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                    {row.status === "success" ? (
                      row.invite_email_sent
                        ? t("results.inviteSent")
                        : t("results.inviteNotSent")
                    ) : (
                      resolveErrorLabel(row.error_code, row.error_message)
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={onReset}>
          {t("actions.uploadAnother")}
        </Button>
      </div>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "neutral" | "success" | "error";
}) {
  return (
    <div className="rounded-lg border bg-card px-5 py-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          "text-3xl font-semibold tracking-tight",
          variant === "success" && "text-success",
          variant === "error" && "text-destructive",
          variant === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
