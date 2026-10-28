"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { evaluateMemberOfMonth } from "@/lib/api/member-of-month";
import { MONTHS_SELECT as MONTHS } from "@/lib/constants";

function getPreviousMonth(): { month: number; year: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-based; 0 = January
  if (month === 0) {
    return { month: 12, year: now.getFullYear() - 1 };
  }
  return { month, year: now.getFullYear() };
}

/** Unique, descending. Always includes `selectedYear` so a row from an older period stays selectable. */
function buildYearOptions(selectedYear: number): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from(
    new Set([currentYear, currentYear - 1, currentYear - 2, selectedYear]),
  ).sort((a, b) => b - a);
}

function resolveDefaultPeriod(
  month?: number,
  year?: number,
): { month: number; year: number } {
  if (
    typeof month === "number" &&
    month >= 1 &&
    month <= 12 &&
    typeof year === "number"
  ) {
    return { month, year };
  }
  return getPreviousMonth();
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EvaluateMemberOfMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sectionId: number;
  sectionName: string;
  /** Period to prefill (e.g. the row being re-evaluated). Defaults to the previous month. */
  defaultMonth?: number;
  defaultYear?: number;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvaluateMemberOfMonthDialog({
  open,
  onOpenChange,
  clubId,
  sectionId,
  sectionName,
  defaultMonth,
  defaultYear,
  onSuccess,
}: EvaluateMemberOfMonthDialogProps) {
  const t = useTranslations("member_of_month");
  const defaultPeriod = resolveDefaultPeriod(defaultMonth, defaultYear);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [year, setYear] = useState(defaultPeriod.year);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const yearOptions = buildYearOptions(year);

  function handleClose(val: boolean) {
    if (!val && !isSubmitting) {
      // Reset to defaults
      setMonth(defaultPeriod.month);
      setYear(defaultPeriod.year);
      onOpenChange(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await evaluateMemberOfMonth(clubId, sectionId, { month, year });
      const monthLabel = MONTHS.find((m) => m.value === month)?.label ?? month;
      toast.success(`Evaluación de ${monthLabel} ${year} completada`);
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.evaluation_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-warning" />
            Evaluar Miembro del Mes
          </DialogTitle>
          <DialogDescription>
            Calcula el miembro con mayor puntaje en{" "}
            <strong>{sectionName}</strong> para el período seleccionado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Month */}
            <div className="space-y-1.5">
              <Label htmlFor="eval_month">Mes</Label>
              <Select
                value={String(month)}
                onValueChange={(val) => setMonth(Number(val))}
              >
                <SelectTrigger id="eval_month" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div className="space-y-1.5">
              <Label htmlFor="eval_year">Año</Label>
              <Select
                value={String(year)}
                onValueChange={(val) => setYear(Number(val))}
              >
                <SelectTrigger id="eval_year" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Si ya existe una evaluación para este período, será reemplazada.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button loading={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  Evaluando...
                </>
              ) : (
                "Evaluar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
