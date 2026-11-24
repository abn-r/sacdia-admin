"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { RowActions } from "@/components/shared/row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTabularNumber } from "@/lib/format-locale";
import { rubricBalance } from "@/lib/camporee-events/rubric-balance";
import type { CamporeeTemplateRubricInput } from "@/lib/api/camporee-scoring";

export interface RubricsEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: CamporeeTemplateRubricInput[];
  onChange: (value: CamporeeTemplateRubricInput[]) => void;
  maxPoints: number;
  enabledFieldName?: string;
  rubricsFieldName?: string;
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
}: RubricsEditorProps) {
  const tEd = useTranslations("camporeeEvents.editors");
  const t = useTranslations("evaluation.camporeeEvents.rubrics");
  const balance = rubricBalance(value, maxPoints);
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

  const figures = {
    total: formatTabularNumber(balance.total),
    max: formatTabularNumber(balance.max),
    diff: formatTabularNumber(Math.abs(balance.diff)),
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name={enabledFieldName} value={enabled ? "on" : ""} />
      <input type="hidden" name={rubricsFieldName} value={JSON.stringify(value)} />
      {enabled && !isValid && (
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

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("scoringTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("scoringHint")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            aria-label={tEd("rubricsEnableAria")}
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
          <span className="text-sm text-muted-foreground">
            {enabled ? t("scoringOn") : t("scoringOff")}
          </span>
        </div>
      </div>

      {enabled && (
        <div className="space-y-4">
          {/* Live sum: quiet when it matches, a warning only when it does not. */}
          {isValid ? (
            <p role="status" className="text-sm text-muted-foreground tabular-nums">
              {t("sumMatch", figures)}
            </p>
          ) : (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="tabular-nums">
                {value.length === 0
                  ? t("sumNone", figures)
                  : balance.state === "over"
                    ? t("sumOver", figures)
                    : t("sumUnder", figures)}
              </span>
            </div>
          )}

          {value.length > 0 ? (
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colCriterion")}</TableHead>
                    <TableHead className="w-28 text-right">{t("colPoints")}</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">{t("colActions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {value.map((rubric, index) => (
                    <TableRow key={index} className="align-top">
                      <TableCell className="space-y-2">
                        <Input
                          id={`rubric-title-${index}`}
                          aria-label={t("criterionAria", { index: index + 1 })}
                          value={rubric.title}
                          maxLength={120}
                          onChange={(event) => updateRubric(index, { title: event.target.value })}
                          placeholder={tEd("rubricTitlePlaceholder")}
                        />
                        <Input
                          aria-label={tEd("rubricDescriptionAria", { index: index + 1 })}
                          value={rubric.description ?? ""}
                          onChange={(event) =>
                            updateRubric(index, { description: event.target.value || null })
                          }
                          placeholder={tEd("rubricDescriptionPlaceholder")}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          id={`rubric-points-${index}`}
                          aria-label={tEd("rubricPointsAria", { index: index + 1 })}
                          className="text-right tabular-nums"
                          type="number"
                          min={0}
                          step="0.01"
                          value={rubric.max_points}
                          onChange={(event) =>
                            updateRubric(index, { max_points: normalizeNumber(event.target.value) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <RowActions
                          label={rubric.title || t("criterionAria", { index: index + 1 })}
                          actions={[
                            {
                              label: tEd("rubricDeleteAria", { index: index + 1 }),
                              icon: Trash2,
                              destructive: true,
                              onSelect: () => removeRubric(index),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}

          <Button type="button" variant="outline" size="sm" onClick={addRubric}>
            <Plus />
            {t("addCriterion")}
          </Button>
        </div>
      )}
    </div>
  );
}
