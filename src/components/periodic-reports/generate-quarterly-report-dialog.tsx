"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { REPORT_QUARTERS, generateQuarterlyReport } from "@/lib/api/reports";

/** The backend rejects years before 2020 (UpdateQuarterly / generate DTO: 2020-2100). */
export const FIRST_REPORT_YEAR = 2020;

export function reportYearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let year = currentYear; year >= FIRST_REPORT_YEAR; year -= 1) years.push(year);
  return years;
}

function currentQuarterOf(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/** "Generar informe" button + dialog. Opens the detail of the report once it exists. */
export function GenerateQuarterlyReportButton() {
  const t = useTranslations("periodicReports");
  const router = useRouter();
  const idPrefix = useId();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = currentQuarterOf(now);

  const [open, setOpen] = useState(false);
  const [clubId, setClubId] = useState<number | null>(null);
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState(String(currentQuarter));
  const [clubError, setClubError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const years = reportYearOptions(currentYear);

  function handleYearChange(value: string) {
    setYear(value);
    // The current quarter is the latest one that can be generated this year.
    if (Number(value) === currentYear && Number(quarter) > currentQuarter) {
      setQuarter(String(currentQuarter));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (clubId == null) {
      setClubError(true);
      return;
    }

    setSubmitting(true);
    try {
      const report = await generateQuarterlyReport({
        clubId,
        year: Number(year),
        quarter: Number(quarter),
      });
      toast.success(t("quarterly.generate.success"));
      setOpen(false);
      router.push(`/dashboard/reports/quarterly/${report.quarterly_report_id}`);
    } catch (error) {
      // Values stay in the form so the operator can adjust and retry.
      toast.error(error instanceof Error ? error.message : t("quarterly.generate.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("common.generate.trigger")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!submitting) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>{t("quarterly.generate.title")}</DialogTitle>
              <DialogDescription>{t("quarterly.generate.description")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <Label>{t("common.generate.club")}</Label>
              <ClubSelect
                value={clubId}
                onChange={(next) => {
                  setClubId(next);
                  if (next != null) setClubError(false);
                }}
                placeholder={t("common.generate.clubPlaceholder")}
                disabled={submitting}
                activeOnly
              />
              {clubError ? (
                <p role="alert" className="text-sm text-destructive">
                  {t("common.generate.clubRequired")}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-year`}>{t("quarterly.generate.year")}</Label>
                <Select value={year} onValueChange={handleYearChange} disabled={submitting}>
                  <SelectTrigger id={`${idPrefix}-year`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-quarter`}>{t("quarterly.generate.quarter")}</Label>
                <Select value={quarter} onValueChange={setQuarter} disabled={submitting}>
                  <SelectTrigger id={`${idPrefix}-quarter`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_QUARTERS.map((option) => (
                      <SelectItem
                        key={option}
                        value={String(option)}
                        disabled={Number(year) === currentYear && option > currentQuarter}
                      >
                        {t("quarterly.quarterOption", { quarter: option })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setOpen(false)}
              >
                {t("common.generate.cancel")}
              </Button>
              <Button type="submit" loading={submitting}>
                {t("common.generate.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
