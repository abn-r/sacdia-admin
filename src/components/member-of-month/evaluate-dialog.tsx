"use client";

import { useState } from "react";
import { Loader2, Trophy } from "lucide-react";
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

function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvaluateMemberOfMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sectionId: number;
  sectionName: string;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvaluateMemberOfMonthDialog({
  open,
  onOpenChange,
  clubId,
  sectionId,
  sectionName,
  onSuccess,
}: EvaluateMemberOfMonthDialogProps) {
  const defaultPeriod = getPreviousMonth();
  const [month, setMonth] = useState(defaultPeriod.month);
  const [year, setYear] = useState(defaultPeriod.year);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const yearOptions = buildYearOptions();

  function handleClose(val: boolean) {
    if (!val && !isSubmitting) {
      // Reset to defaults
      const period = getPreviousMonth();
      setMonth(period.month);
      setYear(period.year);
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
        err instanceof Error ? err.message : "No se pudo completar la evaluación";
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
            <Trophy className="size-4 text-amber-500" />
            Evaluar Miembro del Mes
          </DialogTitle>
          <DialogDescription>
            Calculá el miembro con mayor puntaje en{" "}
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
                <SelectTrigger id="eval_month">
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
                <SelectTrigger id="eval_year">
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
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
