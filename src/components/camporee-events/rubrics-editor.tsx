"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CamporeeTemplateRubricInput } from "@/lib/api/camporee-scoring";

export interface RubricsEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: CamporeeTemplateRubricInput[];
  onChange: (value: CamporeeTemplateRubricInput[]) => void;
  maxPoints: number;
  enabledFieldName?: string;
  rubricsFieldName?: string;
  disabled?: boolean;
}

function normalizeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateRubricsTotal(rubrics: CamporeeTemplateRubricInput[]) {
  return rubrics.reduce((total, rubric) => total + Number(rubric.max_points || 0), 0);
}

export function areRubricsValid(
  enabled: boolean,
  rubrics: CamporeeTemplateRubricInput[],
  maxPoints: number,
) {
  if (!enabled) return true;
  if (rubrics.length === 0) return false;
  return Math.abs(calculateRubricsTotal(rubrics) - maxPoints) < 0.001;
}

export function RubricsEditor({
  enabled,
  onEnabledChange,
  value,
  onChange,
  maxPoints,
  enabledFieldName = "scoring_enabled",
  rubricsFieldName = "rubrics",
  disabled = false,
}: RubricsEditorProps) {
  const total = calculateRubricsTotal(value);
  const isValid = areRubricsValid(enabled, value, maxPoints);

  function updateRubric(index: number, patch: Partial<CamporeeTemplateRubricInput>) {
    onChange(value.map((rubric, i) => (i === index ? { ...rubric, ...patch } : rubric)));
  }

  function addRubric() {
    onChange([
      ...value,
      { title: "", description: null, max_points: 0, display_order: value.length },
    ]);
  }

  function removeRubric(index: number) {
    onChange(
      value
        .filter((_, i) => i !== index)
        .map((rubric, display_order) => ({ ...rubric, display_order })),
    );
  }

  return (
    <section className="space-y-6 rounded-xl border p-6">
      {!disabled && (
        <>
          <input type="hidden" name={enabledFieldName} value={enabled ? "on" : ""} />
          <input type="hidden" name={rubricsFieldName} value={JSON.stringify(value)} />
        </>
      )}
      {!disabled && enabled && !isValid && (
        <input
          aria-hidden="true"
          className="sr-only"
          data-testid="rubrics-total-guard"
          onChange={() => undefined}
          required
          tabIndex={-1}
          value=""
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">Scoring por rúbricas</h2>
          <p className="text-sm text-muted-foreground">
            Activá esta opción cuando el evento/template aporte puntos reales al camporee.
          </p>
          {disabled && (
            <p className="text-sm text-warning">
              Primero cerrá/cierra la inscripción de clubes para congelar las secciones participantes.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            aria-label="Habilitar scoring por rúbricas"
            checked={enabled}
            onCheckedChange={onEnabledChange}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">
            {enabled ? "Puntuable" : "No puntuable"}
          </span>
        </div>
      </div>

      {enabled && (
        <div className="space-y-4">
          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              isValid
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
            role="status"
          >
            Rúbricas: {total} / {maxPoints} puntos
          </div>

          <div className="space-y-3">
            {value.map((rubric, index) => (
              <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_8rem_auto]">
                <div className="space-y-2">
                  <Label htmlFor={`rubric-title-${index}`}>Criterio</Label>
                  <Input
                    id={`rubric-title-${index}`}
                    value={rubric.title}
                    disabled={disabled}
                    maxLength={120}
                    onChange={(event) => updateRubric(index, { title: event.target.value })}
                    placeholder="Ej. Técnica"
                  />
                  <Textarea
                    aria-label={`Descripción criterio ${index + 1}`}
                    value={rubric.description ?? ""}
                    disabled={disabled}
                    rows={2}
                    onChange={(event) =>
                      updateRubric(index, { description: event.target.value || null })
                    }
                    placeholder="Descripción opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rubric-points-${index}`}>Puntos</Label>
                  <Input
                    id={`rubric-points-${index}`}
                    aria-label={`Puntos criterio ${index + 1}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={rubric.max_points}
                    disabled={disabled}
                    onChange={(event) =>
                      updateRubric(index, { max_points: normalizeNumber(event.target.value) })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="self-start md:mt-7"
                  onClick={() => removeRubric(index)}
                  aria-label={`Eliminar criterio ${index + 1}`}
                  disabled={disabled}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRubric}
            disabled={disabled}
          >
            <Plus className="size-4" />
            Agregar criterio
          </Button>
        </div>
      )}
    </section>
  );
}
