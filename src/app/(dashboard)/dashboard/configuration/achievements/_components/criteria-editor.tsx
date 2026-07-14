"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
import type {
  AchievementType,
  AchievementCriteria,
  ThresholdCriteria,
  StreakCriteria,
  CompoundCriteria,
  CompoundCondition,
  MilestoneCriteria,
  CollectionCriteria,
  CriteriaOperator,
  StreakUnit,
  CompoundLogic,
} from "@/lib/api/achievements";

// Event, operator and streak-unit option value lists (values stay in code,
// labels resolved via t() inside components — pattern rule #2).
const EVENT_VALUES = [
  "activity_attendance",
  "honor_completed",
  "class_completed",
  "investiture_completed",
  "camporee_attended",
  "evidence_submitted",
  "evidence_approved",
  "consecutive_attendance",
  "profile_completed",
  "club_role_assigned",
] as const;

const OPERATOR_VALUES: CriteriaOperator[] = ["gte", "lte", "eq"];

const STREAK_UNIT_VALUES: StreakUnit[] = ["day", "week", "month"];

// ─── Sub-editors ──────────────────────────────────────────────────────────────

function ThresholdEditor({
  value,
  onChange,
}: {
  value: ThresholdCriteria;
  onChange: (val: ThresholdCriteria) => void;
}) {
  const t = useTranslations("achievements.forms.criteria");
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("labelEvent")}</Label>
        <Select
          value={value.event}
          onValueChange={(event) => onChange({ ...value, event })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("placeholderEvent")} />
          </SelectTrigger>
          <SelectContent>
            {EVENT_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {t(`eventLabels.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("labelOperator")}</Label>
          <Select
            value={value.operator}
            onValueChange={(operator) =>
              onChange({ ...value, operator: operator as CriteriaOperator })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("placeholderOperator")} />
            </SelectTrigger>
            <SelectContent>
              {OPERATOR_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`operatorLabels.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("labelTarget")}</Label>
          <Input
            type="number"
            min={1}
            value={value.target}
            onChange={(e) =>
              onChange({ ...value, target: Number(e.target.value) })
            }
            placeholder="1"
          />
        </div>
      </div>
    </div>
  );
}

function StreakEditor({
  value,
  onChange,
}: {
  value: StreakCriteria;
  onChange: (val: StreakCriteria) => void;
}) {
  const t = useTranslations("achievements.forms.criteria");
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("labelEvent")}</Label>
        <Select
          value={value.event}
          onValueChange={(event) => onChange({ ...value, event })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("placeholderEvent")} />
          </SelectTrigger>
          <SelectContent>
            {EVENT_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {t(`eventLabels.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t("labelStreakTarget")}</Label>
          <Input
            type="number"
            min={1}
            value={value.target}
            onChange={(e) =>
              onChange({ ...value, target: Number(e.target.value) })
            }
            placeholder="7"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("labelUnit")}</Label>
          <Select
            value={value.streak_unit}
            onValueChange={(streak_unit) =>
              onChange({ ...value, streak_unit: streak_unit as StreakUnit })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("placeholderUnit")} />
            </SelectTrigger>
            <SelectContent>
              {STREAK_UNIT_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`streakUnitLabels.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            {t("labelGrace")}{" "}
            <span className="text-xs text-muted-foreground">{t("labelGraceHint")}</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={value.grace_period ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                grace_period: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}

function CompoundConditionRow({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: CompoundCondition;
  index: number;
  onChange: (val: CompoundCondition) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("achievements.forms.criteria");
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("conditionLabel", { index: index + 1 })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t("labelEvent")}</Label>
        <Select
          value={condition.event}
          onValueChange={(event) => onChange({ ...condition, event })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={t("placeholderEvent")} />
          </SelectTrigger>
          <SelectContent>
            {EVENT_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {t(`eventLabels.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("labelOperator")}</Label>
          <Select
            value={condition.operator}
            onValueChange={(operator) =>
              onChange({ ...condition, operator: operator as CriteriaOperator })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t("placeholderOperator")} />
            </SelectTrigger>
            <SelectContent>
              {OPERATOR_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`operatorLabels.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("labelTarget")}</Label>
          <Input
            type="number"
            min={1}
            className="h-8 text-sm"
            value={condition.target}
            onChange={(e) =>
              onChange({ ...condition, target: Number(e.target.value) })
            }
            placeholder="1"
          />
        </div>
      </div>
    </div>
  );
}

function CompoundEditor({
  value,
  onChange,
}: {
  value: CompoundCriteria;
  onChange: (val: CompoundCriteria) => void;
}) {
  const t = useTranslations("achievements.forms.criteria");

  const addCondition = () => {
    onChange({
      ...value,
      conditions: [
        ...value.conditions,
        { event: "activity_attendance", operator: "gte", target: 1 },
      ],
    });
  };

  const updateCondition = (idx: number, condition: CompoundCondition) => {
    const updated = [...value.conditions];
    updated[idx] = condition;
    onChange({ ...value, conditions: updated });
  };

  const removeCondition = (idx: number) => {
    onChange({
      ...value,
      conditions: value.conditions.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-4">
      {/* Logic selector */}
      <div className="space-y-2">
        <Label>{t("labelLogic")}</Label>
        <div className="flex gap-3">
          {(["AND", "OR"] as CompoundLogic[]).map((logic) => (
            <label
              key={logic}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                name="compound-logic"
                value={logic}
                checked={value.logic === logic}
                onChange={() => onChange({ ...value, logic })}
                className="accent-primary"
              />
              <span className="text-sm font-medium">
                {logic === "AND" ? t("logicAnd") : t("logicOr")}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        {value.conditions.map((condition, idx) => (
          <CompoundConditionRow
            key={idx}
            condition={condition}
            index={idx}
            onChange={(c) => updateCondition(idx, c)}
            onRemove={() => removeCondition(idx)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCondition}
      >
        <Plus className="mr-2 size-3.5" />
        {t("addConditionButton")}
      </Button>
    </div>
  );
}

function MilestoneEditor({
  value,
  onChange,
}: {
  value: MilestoneCriteria;
  onChange: (val: MilestoneCriteria) => void;
}) {
  const t = useTranslations("achievements.forms.criteria");
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("labelEvent")}</Label>
        <Select
          value={value.event}
          onValueChange={(event) => onChange({ ...value, event })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("placeholderEvent")} />
          </SelectTrigger>
          <SelectContent>
            {EVENT_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {t(`eventLabels.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("labelField")}</Label>
          <Input
            value={value.field}
            onChange={(e) => onChange({ ...value, field: e.target.value })}
            placeholder={t("placeholderField")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("labelOperator")}</Label>
          <Select
            value={value.operator}
            onValueChange={(operator) =>
              onChange({ ...value, operator: operator as CriteriaOperator })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("placeholderOperator")} />
            </SelectTrigger>
            <SelectContent>
              {OPERATOR_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`operatorLabels.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("labelTargetValue")}</Label>
        <Input
          value={value.target}
          onChange={(e) => onChange({ ...value, target: e.target.value })}
          placeholder={t("placeholderTargetValue")}
        />
      </div>
    </div>
  );
}

function CollectionEditor({
  value,
  onChange,
}: {
  value: CollectionCriteria;
  onChange: (val: CollectionCriteria) => void;
}) {
  const t = useTranslations("achievements.forms.criteria");
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("labelEvent")}</Label>
        <Select
          value={value.event}
          onValueChange={(event) => onChange({ ...value, event })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("placeholderEvent")} />
          </SelectTrigger>
          <SelectContent>
            {EVENT_VALUES.map((v) => (
              <SelectItem key={v} value={v}>
                {t(`eventLabels.${v}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("labelDistinctField")}</Label>
          <Input
            value={value.distinct_field}
            onChange={(e) => onChange({ ...value, distinct_field: e.target.value })}
            placeholder={t("placeholderDistinctField")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("labelQuantityTarget")}</Label>
          <Input
            type="number"
            min={1}
            value={value.target}
            onChange={(e) =>
              onChange({ ...value, target: Number(e.target.value) })
            }
            placeholder="10"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Default criteria per type ────────────────────────────────────────────────

function getDefaultCriteria(type: AchievementType): AchievementCriteria {
  switch (type) {
    case "THRESHOLD":
      return { event: "activity_attendance", operator: "gte", target: 1 };
    case "STREAK":
      return { event: "consecutive_attendance", target: 7, streak_unit: "day" };
    case "COMPOUND":
      return {
        logic: "AND",
        conditions: [
          { event: "activity_attendance", operator: "gte", target: 1 },
        ],
      };
    case "MILESTONE":
      return { event: "investiture_completed", field: "level", operator: "eq", target: "1" };
    case "COLLECTION":
      return { event: "honor_completed", distinct_field: "honor_id", target: 5 };
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CriteriaEditorProps {
  type: AchievementType;
  initialValue?: AchievementCriteria | null;
  onChange?: (criteria: AchievementCriteria) => void;
}

export function CriteriaEditor({ type, initialValue, onChange }: CriteriaEditorProps) {
  const t = useTranslations("achievements.forms.criteria");
  const [criteria, setCriteria] = useState<AchievementCriteria>(
    () => initialValue ?? getDefaultCriteria(type),
  );

  const handleChange = (newCriteria: AchievementCriteria) => {
    setCriteria(newCriteria);
    onChange?.(newCriteria);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t(`typeDescriptions.${type}`)}</p>

      {type === "THRESHOLD" && (
        <ThresholdEditor
          value={criteria as ThresholdCriteria}
          onChange={handleChange}
        />
      )}
      {type === "STREAK" && (
        <StreakEditor
          value={criteria as StreakCriteria}
          onChange={handleChange}
        />
      )}
      {type === "COMPOUND" && (
        <CompoundEditor
          value={criteria as CompoundCriteria}
          onChange={handleChange}
        />
      )}
      {type === "MILESTONE" && (
        <MilestoneEditor
          value={criteria as MilestoneCriteria}
          onChange={handleChange}
        />
      )}
      {type === "COLLECTION" && (
        <CollectionEditor
          value={criteria as CollectionCriteria}
          onChange={handleChange}
        />
      )}

      {/* Hidden field carrying the serialized JSON value */}
      <input type="hidden" name="criteria" value={JSON.stringify(criteria)} />
    </div>
  );
}
