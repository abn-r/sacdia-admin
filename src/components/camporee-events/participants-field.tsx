"use client";

/**
 * ParticipantsField
 *
 * Toggleable participants editor.
 *   - mode "count": single numeric Input for total participant count.
 *   - mode "by_class": multi-row picker [{class_id, count}] using ProgressiveClass options.
 *
 * Emits via hidden inputs:
 *   - participants_mode   ("count" | "by_class")
 *   - participants_count  (if mode = "count")
 *   - participants_by_class  (JSON string, if mode = "by_class")
 */

import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ParticipantsMode, ParticipantsByClass } from "@/lib/api/camporee-events";
import type { ProgressiveClass } from "@/lib/api/classes";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ParticipantsFieldProps {
  mode: ParticipantsMode;
  onModeChange: (mode: ParticipantsMode) => void;
  count: number | null;
  onCountChange: (count: number | null) => void;
  byClass: ParticipantsByClass[];
  onByClassChange: (rows: ParticipantsByClass[]) => void;
  classes: ProgressiveClass[];
  labels?: {
    modeLabel?: string;
    modeCount?: string;
    modeByClass?: string;
    countLabel?: string;
    countPlaceholder?: string;
    classLabel?: string;
    classPlaceholder?: string;
    classCountLabel?: string;
    addButton?: string;
    removeButton?: string;
  };
}

const DEFAULT_LABELS = {
  modeLabel: "Modo de participantes",
  modeCount: "Cantidad total",
  modeByClass: "Por clase",
  countLabel: "Cantidad de participantes",
  countPlaceholder: "Ej. 10",
  classLabel: "Clase",
  classPlaceholder: "Seleccionar clase",
  classCountLabel: "Cantidad",
  addButton: "Agregar clase",
  removeButton: "Eliminar",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function ParticipantsField({
  mode,
  onModeChange,
  count,
  onCountChange,
  byClass,
  onByClassChange,
  classes,
  labels = {},
}: ParticipantsFieldProps) {
  const l = { ...DEFAULT_LABELS, ...labels };

  const addClassRow = useCallback(() => {
    onByClassChange([...byClass, { class_id: 0, count: 1 }]);
  }, [byClass, onByClassChange]);

  const removeClassRow = useCallback(
    (index: number) => {
      onByClassChange(byClass.filter((_, i) => i !== index));
    },
    [byClass, onByClassChange],
  );

  const updateClassRow = useCallback(
    (index: number, field: "class_id" | "count", raw: string) => {
      const updated = byClass.map((row, i) => {
        if (i !== index) return row;
        const n = Number(raw);
        return { ...row, [field]: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0 };
      });
      onByClassChange(updated);
    },
    [byClass, onByClassChange],
  );

  return (
    <div className="space-y-4">
      {/* Hidden inputs for FormData */}
      <input type="hidden" name="participants_mode" value={mode} />
      {mode === "count" && (
        <input
          type="hidden"
          name="participants_count"
          value={count !== null ? String(count) : ""}
        />
      )}
      {mode === "by_class" && (
        <input
          type="hidden"
          name="participants_by_class"
          value={JSON.stringify(byClass)}
        />
      )}

      {/* Mode selector */}
      <div className="space-y-2">
        <Label>{l.modeLabel}</Label>
        <Select value={mode} onValueChange={(v) => onModeChange(v as ParticipantsMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">{l.modeCount}</SelectItem>
            <SelectItem value="by_class">{l.modeByClass}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count mode */}
      {mode === "count" && (
        <div className="space-y-2">
          <Label htmlFor="participants_count_input">
            {l.countLabel} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="participants_count_input"
            type="number"
            min={1}
            value={count !== null ? String(count) : ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              onCountChange(Number.isFinite(n) && n > 0 ? Math.floor(n) : null);
            }}
            placeholder={l.countPlaceholder}
          />
        </div>
      )}

      {/* By-class mode */}
      {mode === "by_class" && (
        <div className="space-y-3">
          {byClass.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay clases definidas.</p>
          )}
          {byClass.map((row, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border bg-muted/10 p-3 sm:grid-cols-[1fr_120px_auto]"
            >
              {/* Class select */}
              <div className="space-y-1">
                {index === 0 && (
                  <Label className="text-xs text-muted-foreground">{l.classLabel}</Label>
                )}
                <Select
                  value={row.class_id > 0 ? String(row.class_id) : ""}
                  onValueChange={(v) => updateClassRow(index, "class_id", v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={l.classPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.class_id} value={String(c.class_id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Count per class */}
              <div className="space-y-1">
                {index === 0 && (
                  <Label className="text-xs text-muted-foreground">{l.classCountLabel}</Label>
                )}
                <Input
                  type="number"
                  min={1}
                  value={row.count}
                  onChange={(e) => updateClassRow(index, "count", e.target.value)}
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
                  onClick={() => removeClassRow(index)}
                  title={l.removeButton}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addClassRow}>
            <Plus className="size-3.5" />
            {l.addButton}
          </Button>
        </div>
      )}
    </div>
  );
}
