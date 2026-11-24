"use client";

import { useMemo, useState } from "react";
import type { Locale as DateFnsLocale } from "date-fns/locale";
import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";
import { fr } from "date-fns/locale/fr";
import { ptBR } from "date-fns/locale/pt-BR";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Locale } from "@/i18n/request";

const DAY_PICKER_LOCALES: Record<Locale, DateFnsLocale> = {
  es,
  en: enUS,
  fr,
  "pt-BR": ptBR,
};

const PICKER_YEARS_BACK = 10;
const PICKER_YEARS_FORWARD = 5;

/** The period label as a button: jump to any date. */
export function ActivitiesPeriodPicker({
  anchor,
  periodLabel,
  onSelectDate,
}: {
  anchor: Date;
  periodLabel: string;
  onSelectDate: (date: Date) => void;
}) {
  const tCal = useTranslations("activities.calendar");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(anchor);

  const dayPickerLocale = DAY_PICKER_LOCALES[locale as Locale] ?? es;

  const { startMonth, endMonth } = useMemo(() => {
    const year = anchor.getFullYear();
    return {
      startMonth: new Date(year - PICKER_YEARS_BACK, 0),
      endMonth: new Date(year + PICKER_YEARS_FORWARD, 11),
    };
  }, [anchor]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setPickerMonth(anchor);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={tCal("pickDate")}
          className="min-w-[11.25rem] max-w-[20rem] font-medium"
        >
          <span className="truncate">{periodLabel}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={anchor}
          month={pickerMonth}
          onMonthChange={setPickerMonth}
          onSelect={(date) => {
            if (!date) return;
            onSelectDate(date);
            setOpen(false);
          }}
          captionLayout="dropdown"
          navLayout="after"
          startMonth={startMonth}
          endMonth={endMonth}
          locale={dayPickerLocale}
          labels={{
            labelMonthDropdown: () => tCal("chooseMonth"),
            labelYearDropdown: () => tCal("chooseYear"),
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
