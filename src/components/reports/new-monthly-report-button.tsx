"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createOrGetDraftReport } from "@/lib/api/monthly-reports";
import { monthlyYearOptions } from "@/lib/reports/status";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

interface NewMonthlyReportButtonProps {
  enrollmentId: string | number;
  /** Month (1-12) and year the dialog opens on. */
  initialMonth: number;
  initialYear: number;
}

/** «Nuevo informe»: pick the month, create (or reopen) its draft and go to it. */
export function NewMonthlyReportButton({ enrollmentId, initialMonth, initialYear }: NewMonthlyReportButtonProps) {
  const t = useTranslations("evaluation.reports");
  const tr = useTranslations("reports");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  async function create() {
    const report = await createOrGetDraftReport(enrollmentId, month, year);
    toast.success(tr("list.toastCreated", { month: tr(`months.${month}` as Parameters<typeof tr>[0]), year }));
    router.push(`/dashboard/reports/${report.report_id}`);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {tr("list.newReport")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("create.title")}
        description={
          <div className="space-y-4">
            <p>{t("create.description")}</p>
            <div className="flex flex-wrap gap-3 text-foreground">
              <div className="space-y-1.5">
                <Label htmlFor="new-report-month">{t("create.month")}</Label>
                <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                  <SelectTrigger id="new-report-month" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {tr(`months.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-report-year">{t("create.year")}</Label>
                <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                  <SelectTrigger id="new-report-year" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthlyYearOptions(initialYear).map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        }
        confirmLabel={t("create.confirm")}
        onConfirm={create}
      />
    </>
  );
}
