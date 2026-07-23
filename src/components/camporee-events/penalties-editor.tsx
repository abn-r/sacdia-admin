"use client";

/**
 * PenaltiesEditor
 *
 * Dynamic list editor for the JSONB `penalties` field.
 * Each row: { description, points_deducted, time_seconds? }
 *
 * Time UI = minutes + seconds; stored as total `time_seconds`.
 * Emits the serialized JSON string via a hidden input with name `penalties`.
 */

import { useCallback } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PenaltyRule } from "@/lib/api/camporee-events";

interface PenaltiesEditorProps {
  value: PenaltyRule[];
  onChange: (rules: PenaltyRule[]) => void;
  /** Labels passed from parent (to avoid useTranslations coupling) */
  labels?: {
    description?: string;
    points?: string;
    time?: string;
    minutes?: string;
    seconds?: string;
    addButton?: string;
    removeButton?: string;
  };
}

const DEFAULT_LABELS = {
  description: "Descripción de la penalización",
  points: "Puntos",
  time: "Tiempo",
  minutes: "Min",
  seconds: "Seg",
  addButton: "Agregar penalización",
  removeButton: "Eliminar",
};

function splitSeconds(total: number | null | undefined): {
  minutes: string;
  seconds: string;
} {
  if (total == null || !Number.isFinite(total) || total < 0) {
    return { minutes: "", seconds: "" };
  }
  const floored = Math.floor(total);
  return {
    minutes: String(Math.floor(floored / 60)),
    seconds: String(floored % 60),
  };
}

function combineToSeconds(minutesRaw: string, secondsRaw: string): number | null {
  const minEmpty = minutesRaw.trim() === "";
  const secEmpty = secondsRaw.trim() === "";
  if (minEmpty && secEmpty) return null;

  const minutes = minEmpty ? 0 : Number(minutesRaw);
  const seconds = secEmpty ? 0 : Number(secondsRaw);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  if (minutes < 0 || seconds < 0) return null;

  return Math.floor(minutes) * 60 + Math.floor(seconds);
}

export function PenaltiesEditor({
  value,
  onChange,
  labels = {},
}: PenaltiesEditorProps) {
  const l = { ...DEFAULT_LABELS, ...labels };

  const addRow = useCallback(() => {
    onChange([...value, { description: "", points_deducted: 0, time_seconds: null }]);
  }, [value, onChange]);

  const removeRow = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  const updateRow = useCallback(
    (index: number, field: "description" | "points_deducted", raw: string) => {
      const updated = value.map((row, i) => {
        if (i !== index) return row;
        if (field === "description") {
          return { ...row, description: raw };
        }
        const n = Number(raw);
        return { ...row, points_deducted: Number.isFinite(n) ? n : 0 };
      });
      onChange(updated);
    },
    [value, onChange],
  );

  const updateTimePart = useCallback(
    (index: number, part: "minutes" | "seconds", raw: string) => {
      if (raw !== "" && !/^\d+$/.test(raw)) return;
      const row = value[index];
      const current = splitSeconds(row.time_seconds);
      const minutes = part === "minutes" ? raw : current.minutes;
      const seconds = part === "seconds" ? raw : current.seconds;
      const time_seconds = combineToSeconds(minutes, seconds);
      onChange(
        value.map((item, i) => (i === index ? { ...item, time_seconds } : item)),
      );
    },
    [value, onChange],
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="penalties" value={JSON.stringify(value)} />

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin penalizaciones definidas.</p>
      )}

      {value.map((row, index) => {
        const timeParts = splitSeconds(row.time_seconds);
        return (
          <div
            key={index}
            className="grid gap-3 rounded-lg border bg-muted/10 p-3 sm:grid-cols-[1fr_100px_minmax(140px,180px)_auto]"
          >
            <div className="space-y-1">
              {index === 0 && (
                <Label className="text-xs text-muted-foreground">{l.description}</Label>
              )}
              <Input
                value={row.description}
                onChange={(e) => updateRow(index, "description", e.target.value)}
                placeholder={l.description}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              {index === 0 && (
                <Label className="text-xs text-muted-foreground">{l.points}</Label>
              )}
              <Input
                type="number"
                min={0}
                value={row.points_deducted}
                onChange={(e) => updateRow(index, "points_deducted", e.target.value)}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              {index === 0 && (
                <Label className="text-xs text-muted-foreground">{l.time}</Label>
              )}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`${l.minutes} — penalización ${index + 1}`}
                  value={timeParts.minutes}
                  onChange={(e) => updateTimePart(index, "minutes", e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm"
                />
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {l.minutes}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  inputMode="numeric"
                  aria-label={`${l.seconds} — penalización ${index + 1}`}
                  value={timeParts.seconds}
                  onChange={(e) => updateTimePart(index, "seconds", e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm"
                />
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {l.seconds}
                </span>
              </div>
            </div>

            <div className={index === 0 ? "pt-5" : "flex items-center"}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => removeRow(index)}
                title={l.removeButton}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="size-3.5" />
        {l.addButton}
      </Button>
    </div>
  );
}
