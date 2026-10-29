"use client";

import { useState } from "react";
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
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { EcclesiasticalYearSelect } from "@/components/shared/selectors/ecclesiastical-year-select";
import { generateAnnualReport } from "@/lib/api/reports";

/** "Generar informe" button + dialog. Opens the detail of the report once it exists. */
export function GenerateAnnualReportButton() {
  const t = useTranslations("periodicReports");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [clubId, setClubId] = useState<number | null>(null);
  const [yearId, setYearId] = useState<number | null>(null);
  const [clubError, setClubError] = useState(false);
  const [yearError, setYearError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setClubError(clubId == null);
    setYearError(yearId == null);
    if (clubId == null || yearId == null) return;

    setSubmitting(true);
    try {
      const report = await generateAnnualReport({ clubId, ecclesiasticalYearId: yearId });
      toast.success(t("annual.generate.success"));
      setOpen(false);
      router.push(`/dashboard/reports/annual/${report.annual_report_id}`);
    } catch (error) {
      // Values stay in the form so the operator can adjust and retry.
      toast.error(error instanceof Error ? error.message : t("annual.generate.error"));
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
              <DialogTitle>{t("annual.generate.title")}</DialogTitle>
              <DialogDescription>{t("annual.generate.description")}</DialogDescription>
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

            <div className="space-y-2">
              <Label>{t("annual.generate.year")}</Label>
              <EcclesiasticalYearSelect
                value={yearId}
                onChange={(next) => {
                  setYearId(next);
                  if (next != null) setYearError(false);
                }}
                disabled={submitting}
                activeOnly={false}
              />
              {yearError ? (
                <p role="alert" className="text-sm text-destructive">
                  {t("annual.generate.yearRequired")}
                </p>
              ) : null}
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
