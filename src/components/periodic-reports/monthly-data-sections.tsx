"use client";

import { useLocale, useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { localeToBcp47 } from "@/lib/format-locale";
import type { ReportMonthlyText } from "@/lib/api/reports";

/** "Basado en N meses con informe mensual enviado"; a neutral hint when none were sent. */
export function MonthlyBasisNote({ monthsSubmitted }: { monthsSubmitted: number | null | undefined }) {
  const t = useTranslations("periodicReports.common.monthly");
  const count = monthsSubmitted ?? 0;

  return (
    <Alert>
      <AlertDescription>
        {count > 0 ? t("basedOn", { count }) : t("noneSubmitted")}
      </AlertDescription>
    </Alert>
  );
}

/** Free text collected month by month: "Marzo de 2026: texto". Empty → placeholder. */
export function ReportMonthlyTextCard({
  title,
  entries,
}: {
  title: string;
  entries: { label: string; items: ReportMonthlyText | null | undefined }[];
}) {
  const t = useTranslations("periodicReports.common.monthly");
  const locale = useLocale();
  const formatter = new Intl.DateTimeFormat(localeToBcp47(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const monthLabel = (year: number, month: number) => {
    const label = formatter.format(new Date(Date.UTC(year, month - 1, 1)));
    return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map(({ label, items }) => {
          const filled = (items ?? []).filter((item) => item.text?.trim());
          return (
            <div key={label}>
              <h3 className="text-xs text-muted-foreground">{label}</h3>
              {filled.length === 0 ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{t("noText")}</p>
              ) : (
                <ul className="mt-1 space-y-1.5 text-sm">
                  {filled.map((item) => (
                    <li key={`${item.year}-${item.month}`}>
                      <span className="font-medium">{monthLabel(item.year, item.month)}: </span>
                      <span className="whitespace-pre-wrap">{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
