"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  Send,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualDataForm } from "@/components/reports/manual-data-form";
import {
  generateReport,
  submitReport,
  getReportPdfUrl,
  type MonthlyReport,
  type MonthlyReportAutoData,
} from "@/lib/api/monthly-reports";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

const STATUS_CONFIG = {
  draft: { label: "Borrador", variant: "warning" as const },
  generated: { label: "Generado", variant: "default" as const },
  submitted: { label: "Enviado", variant: "success" as const },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ─── Auto-data card ────────────────────────────────────────────────────────────

interface AutoDataRow {
  label: string;
  value: unknown;
}

function AutoDataCard({
  title,
  rows,
  description,
}: {
  title: string;
  description?: string;
  rows: AutoDataRow[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {rows.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">
                {value != null && value !== "" ? String(value) : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function AutoDataSection({
  data,
  title,
}: {
  data?: MonthlyReportAutoData | null;
  title: string;
}) {
  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No hay datos disponibles para este período.
      </div>
    );
  }

  const rows: AutoDataRow[] = [
    { label: "Total miembros", value: data.members_total },
    { label: "Miembros activos", value: data.members_active },
    { label: "Actividades", value: data.activities_count },
    { label: "Especialidades obtenidas", value: data.honors_earned },
    { label: "Clases completadas", value: data.classes_completed },
    {
      label: "Asistencia promedio",
      value: data.attendance_rate != null
        ? `${Number(data.attendance_rate).toFixed(1)}%`
        : null,
    },
  ];

  return (
    <AutoDataCard
      title={title}
      description="Datos calculados automáticamente por el sistema."
      rows={rows}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportDetailClientProps {
  report: MonthlyReport;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportDetailClient({ report: initialReport }: ReportDetailClientProps) {
  const t = useTranslations("reports");
  const router = useRouter();
  const [report, setReport] = useState<MonthlyReport>(initialReport);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const statusConfig = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
  const monthName = MONTH_NAMES[report.month] ?? String(report.month);
  const isSubmitted = report.status === "submitted";
  const isGenerated = report.status === "generated";

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const updated = await generateReport(report.report_id);
      setReport(updated);
      toast.success(t("toasts.report_generated"));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.generate_report");
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }, [report.report_id, router]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const updated = await submitReport(report.report_id);
      setReport(updated);
      toast.success(t("toasts.report_sent"));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.send_report");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [report.report_id, router]);

  const handleDownloadPdf = useCallback(() => {
    const url = getReportPdfUrl(report.report_id);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [report.report_id]);

  return (
    <div className="space-y-6">
      {/* Report meta info */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Estado:</span>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="text-sm text-muted-foreground">
          Período:{" "}
          <span className="font-medium text-foreground">
            {monthName} {report.year}
          </span>
        </div>
        {report.generated_at && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="text-sm text-muted-foreground">
              Generado:{" "}
              <span className="font-medium text-foreground">
                {formatDate(report.generated_at)}
              </span>
            </div>
          </>
        )}
        {report.submitted_at && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="text-sm text-muted-foreground">
              Enviado:{" "}
              <span className="font-medium text-foreground">
                {formatDate(report.submitted_at)}
              </span>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!isSubmitted && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generating || submitting}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              {isGenerated ? "Re-generar" : "Generar reporte"}
            </Button>
          )}
          {isGenerated && !isSubmitted && (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={generating || submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Enviar al campo
            </Button>
          )}
          {(isGenerated || isSubmitted) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
            >
              <Download className="size-4" />
              Descargar PDF
            </Button>
          )}
          {isSubmitted && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
            >
              <ExternalLink className="size-4" />
              Ver PDF
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="auto">
        <TabsList>
          <TabsTrigger value="auto">Datos automaticos</TabsTrigger>
          <TabsTrigger value="manual">Datos manuales</TabsTrigger>
          {report.snapshot_data && (
            <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
          )}
        </TabsList>

        {/* Auto-calculated data */}
        <TabsContent value="auto" className="mt-4 space-y-4">
          <AutoDataSection
            data={report.auto_data}
            title="Datos del período (en vivo)"
          />
        </TabsContent>

        {/* Manual data form */}
        <TabsContent value="manual" className="mt-4">
          <ManualDataForm
            reportId={report.report_id}
            initialData={report.manual_data}
            disabled={isSubmitted}
            onSuccess={() => {
              toast.success(t("toasts.data_updated"));
            }}
          />
        </TabsContent>

        {/* Frozen snapshot */}
        {report.snapshot_data && (
          <TabsContent value="snapshot" className="mt-4 space-y-4">
            <AutoDataSection
              data={report.snapshot_data}
              title="Datos congelados (snapshot al generar)"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
