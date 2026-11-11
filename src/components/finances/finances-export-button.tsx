"use client";

import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadFinanceExport, type FinanceExportFormat } from "@/lib/api/finances";

interface FinancesExportButtonProps {
  clubId: number;
  /** Calendar year; the export requires one. */
  year: number | undefined;
  month?: number;
  clubSectionId?: number;
}

export function FinancesExportButton({
  clubId,
  year,
  month,
  clubSectionId,
}: FinancesExportButtonProps) {
  const t = useTranslations("finances.dashboard");
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: FinanceExportFormat) {
    if (!year) return;
    setExporting(true);
    try {
      const file = await downloadFinanceExport({ clubId, year, month, clubSectionId, format });
      toast.success(t("exported", { file }));
    } catch (error) {
      const status = (error as { status?: number }).status;
      toast.error(status === 403 ? t("exportForbidden") : t("exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          disabled={!year || exporting}
          loading={exporting}
          title={!year ? t("exportYearRequired") : undefined}
        >
          {!exporting ? <Download className="size-4" /> : null}
          {exporting ? t("exporting") : t("exportButton")}
          {!exporting ? (
            <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void handleExport("xlsx")}>
          <FileSpreadsheet className="size-4" />
          {t("exportExcel")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleExport("pdf")}>
          <FileText className="size-4" />
          {t("exportPdf")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
