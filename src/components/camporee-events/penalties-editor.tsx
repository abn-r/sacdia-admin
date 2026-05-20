"use client";

/**
 * PenaltiesEditor
 *
 * Dynamic list editor for the JSONB `penalties` field.
 * Each row: { description, points_deducted, time_seconds? }
 *
 * Emits the serialized JSON string via a hidden input with name `penalties`.
 * Parent forms read it as JSON.parse(formData.get("penalties")).
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
    addButton?: string;
    removeButton?: string;
  };
}

const DEFAULT_LABELS = {
  description: "Descripción de la penalización",
  points: "Puntos descontados",
  time: "Tiempo (seg.)",
  addButton: "Agregar penalización",
  removeButton: "Eliminar",
};

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
    (index: number, field: keyof PenaltyRule, raw: string) => {
      const updated = value.map((row, i) => {
        if (i !== index) return row;
        if (field === "description") {
          return { ...row, description: raw };
        }
        if (field === "points_deducted") {
          const n = Number(raw);
          return { ...row, points_deducted: Number.isFinite(n) ? n : 0 };
        }
        if (field === "time_seconds") {
          const n = Number(raw);
          return {
            ...row,
            time_seconds: raw.trim() === "" || !Number.isFinite(n) ? null : Math.floor(n),
          };
        }
        return row;
      });
      onChange(updated);
    },
    [value, onChange],
  );

  return (
    <div className="space-y-3">
      {/* Hidden input carries serialized JSON for FormData */}
      <input type="hidden" name="penalties" value={JSON.stringify(value)} />

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin penalizaciones definidas.</p>
      )}

      {value.map((row, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-lg border bg-muted/10 p-3 sm:grid-cols-[1fr_120px_120px_auto]"
        >
          {/* Description */}
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

          {/* Points deducted */}
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

          {/* Time in seconds (optional) */}
          <div className="space-y-1">
            {index === 0 && (
              <Label className="text-xs text-muted-foreground">{l.time}</Label>
            )}
            <Input
              type="number"
              min={0}
              value={row.time_seconds ?? ""}
              onChange={(e) => updateRow(index, "time_seconds", e.target.value)}
              placeholder="—"
              className="h-8 text-sm"
            />
          </div>

          {/* Remove */}
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
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="size-3.5" />
        {l.addButton}
      </Button>
    </div>
  );
}
