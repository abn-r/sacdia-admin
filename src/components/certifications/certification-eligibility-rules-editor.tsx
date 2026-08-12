"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";
import { ListChecks } from "lucide-react";
import {
  replaceEligibilityRules,
  CERTIFICATION_ELIGIBILITY_RULE_TYPES,
  type AdminEligibilityRule,
  type CertificationEligibilityRuleType,
  type UpsertEligibilityRuleInput,
} from "@/lib/api/certifications";

type EditableRule = {
  _key: string;
  rule_type: CertificationEligibilityRuleType;
  min_age: string;
  class_id: string;
  club_type_id: string;
  role_id: string;
};

function toEditableRule(rule: AdminEligibilityRule, key: string): EditableRule {
  const config = (rule.configuration ?? {}) as { min_age?: number };
  return {
    _key: key,
    rule_type: rule.rule_type,
    min_age: typeof config.min_age === "number" ? String(config.min_age) : "",
    class_id: rule.class_id != null ? String(rule.class_id) : "",
    club_type_id: rule.club_type_id != null ? String(rule.club_type_id) : "",
    role_id: rule.role_id ?? "",
  };
}

function createEmptyRule(key: string): EditableRule {
  return {
    _key: key,
    rule_type: "MIN_AGE",
    min_age: "16",
    class_id: "",
    club_type_id: "",
    role_id: "",
  };
}

interface CertificationEligibilityRulesEditorProps {
  certificationId: number;
  versionId: number;
  rules: AdminEligibilityRule[];
  readOnly: boolean;
  onSaved: (rules: AdminEligibilityRule[]) => void;
}

export function CertificationEligibilityRulesEditor({
  certificationId,
  versionId,
  rules,
  readOnly,
  onSaved,
}: CertificationEligibilityRulesEditorProps) {
  const t = useTranslations("certificationsAdmin.eligibility");
  const keyCounter = useRef(0);
  const nextKey = () => `rule-${keyCounter.current++}`;

  const [localRules, setLocalRules] = useState<EditableRule[]>(() =>
    rules.map((rule) => toEditableRule(rule, nextKey())),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalRules(rules.map((rule) => toEditableRule(rule, nextKey())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  function updateRule(index: number, patch: Partial<EditableRule>) {
    setLocalRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  }

  function addRule() {
    setLocalRules((prev) => [...prev, createEmptyRule(nextKey())]);
  }

  function removeRule(index: number) {
    setLocalRules((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRule(index: number, direction: -1 | 1) {
    setLocalRules((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function validate(): string | null {
    for (const rule of localRules) {
      if (rule.rule_type === "MIN_AGE") {
        const parsed = Number(rule.min_age);
        if (!Number.isInteger(parsed) || parsed < 0) {
          return t("validation.minAgeInvalid");
        }
      }
      if (rule.rule_type === "INVESTED_CLASS" && !rule.class_id.trim()) {
        return t("validation.classIdRequired");
      }
      if (rule.rule_type === "ACTIVE_CLUB_TYPE" && !rule.club_type_id.trim()) {
        return t("validation.clubTypeIdRequired");
      }
      if (rule.rule_type === "ACTIVE_ROLE" && !rule.role_id.trim()) {
        return t("validation.roleIdRequired");
      }
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload: UpsertEligibilityRuleInput[] = localRules.map((rule, index) => {
      const base: UpsertEligibilityRuleInput = {
        rule_type: rule.rule_type,
        sort_order: index,
      };
      if (rule.rule_type === "MIN_AGE") {
        base.configuration = { min_age: Number(rule.min_age) };
      } else if (rule.rule_type === "INVESTED_CLASS") {
        base.class_id = Number(rule.class_id);
      } else if (rule.rule_type === "ACTIVE_CLUB_TYPE") {
        base.club_type_id = Number(rule.club_type_id);
      } else if (rule.rule_type === "ACTIVE_ROLE") {
        base.role_id = rule.role_id.trim();
      }
      return base;
    });

    setIsSaving(true);
    try {
      const saved = await replaceEligibilityRules(certificationId, versionId, payload);
      onSaved(saved);
      toast.success(t("toasts.saved"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.saveFailed");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t("title")}</h3>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            <Plus className="size-4" />
            {t("addRule")}
          </Button>
        )}
      </div>

      {localRules.length === 0 ? (
        <EmptyState icon={ListChecks} title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {localRules.map((rule, index) => (
            <div
              key={rule._key}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`rule-type-${rule._key}`}>{t("ruleType")}</Label>
                <Select
                  value={rule.rule_type}
                  disabled={readOnly}
                  onValueChange={(value) =>
                    updateRule(index, { rule_type: value as CertificationEligibilityRuleType })
                  }
                >
                  <SelectTrigger id={`rule-type-${rule._key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CERTIFICATION_ELIGIBILITY_RULE_TYPES.map((ruleType) => (
                      <SelectItem key={ruleType} value={ruleType}>
                        {t(`ruleTypeLabels.${ruleType}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rule.rule_type === "MIN_AGE" && (
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`rule-min-age-${rule._key}`}>{t("fields.minAge")}</Label>
                  <Input
                    id={`rule-min-age-${rule._key}`}
                    type="number"
                    min={0}
                    disabled={readOnly}
                    value={rule.min_age}
                    onChange={(e) => updateRule(index, { min_age: e.target.value })}
                  />
                </div>
              )}
              {rule.rule_type === "INVESTED_CLASS" && (
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`rule-class-id-${rule._key}`}>{t("fields.classId")}</Label>
                  <Input
                    id={`rule-class-id-${rule._key}`}
                    type="number"
                    min={1}
                    disabled={readOnly}
                    value={rule.class_id}
                    onChange={(e) => updateRule(index, { class_id: e.target.value })}
                  />
                </div>
              )}
              {rule.rule_type === "ACTIVE_CLUB_TYPE" && (
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`rule-club-type-id-${rule._key}`}>
                    {t("fields.clubTypeId")}
                  </Label>
                  <Input
                    id={`rule-club-type-id-${rule._key}`}
                    type="number"
                    min={1}
                    disabled={readOnly}
                    value={rule.club_type_id}
                    onChange={(e) => updateRule(index, { club_type_id: e.target.value })}
                  />
                </div>
              )}
              {rule.rule_type === "ACTIVE_ROLE" && (
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`rule-role-id-${rule._key}`}>{t("fields.roleId")}</Label>
                  <Input
                    id={`rule-role-id-${rule._key}`}
                    disabled={readOnly}
                    value={rule.role_id}
                    onChange={(e) => updateRule(index, { role_id: e.target.value })}
                  />
                </div>
              )}
              {rule.rule_type === "BAPTIZED" && (
                <p className="flex-1 text-xs text-muted-foreground">{t("noConfigNeeded")}</p>
              )}

              {!readOnly && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => moveRule(index, -1)}
                    aria-label={t("moveUp")}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === localRules.length - 1}
                    onClick={() => moveRule(index, 1)}
                    aria-label={t("moveDown")}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeRule(index)}
                    aria-label={t("remove")}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
