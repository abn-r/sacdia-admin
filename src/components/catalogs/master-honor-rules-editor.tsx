"use client";

import { useCallback, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type MasterHonorPayload,
  type MasterHonorRuleGroupPayload,
  type MasterHonorRuleGroupType,
  type MasterHonorRuleOptionPayload,
} from "@/lib/api/phase-e-catalogs";

export type MasterHonorAuxHonor = {
  honor_id: number;
  name: string;
};

export type MasterHonorAuxCategory = {
  honor_category_id: number;
  name: string;
};

export type MasterHonorAuxDivision = {
  division_id: number;
  name: string;
};

export interface MasterHonorRulesEditorProps {
  value: MasterHonorPayload;
  onChange: (value: MasterHonorPayload) => void;
  honors: MasterHonorAuxHonor[];
  honorCategories: MasterHonorAuxCategory[];
  divisions: MasterHonorAuxDivision[];
}

const DEFAULT_SCOPE = "ALL" as const;

function toPositiveId(value: unknown): number | undefined {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

function toNonNegativeInt(value: unknown): number | undefined {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function toText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toGroupType(value: unknown): MasterHonorRuleGroupType {
  return value === "CATEGORY_COUNT" ? "CATEGORY_COUNT" : "EXPLICIT_OPTIONS";
}

function parseIdList(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  const ids = values
    .map((value) => toPositiveId(value))
    .filter((id): id is number => Number.isFinite(id));
  return Array.from(new Set(ids));
}

function parseMasterHonorDivisionIds(raw: unknown): number[] {
  if (!raw || typeof raw !== "object") return [];
  const value = raw as Record<string, unknown>;
  const explicit = parseIdList(value.division_ids);

  const nested = Array.isArray(value.master_honor_divisions)
    ? value.master_honor_divisions
    : [];
  const nestedIds = nested
    .map((entry) => toPositiveId(
      typeof entry === "object" && entry !== null && "division_id" in entry
        ? (entry as Record<string, unknown>).division_id
        : undefined,
    ))
    .filter((id): id is number => typeof id === "number");

  return Array.from(new Set([...explicit, ...nestedIds]));
}

function parseHonorIdsFromOption(rawOption: unknown): number[] {
  if (!rawOption || typeof rawOption !== "object") return [];
  const option = rawOption as Record<string, unknown>;
  const honorIds = parseIdList(option.honor_ids);

  const nestedHonors = Array.isArray(option.honors) ? option.honors : [];
  const derived = nestedHonors
    .map((honor) => {
      if (typeof honor === "number") return toPositiveId(honor);
      if (!honor || typeof honor !== "object") return undefined;
      const record = honor as Record<string, unknown>;
      if ("honor_id" in record) {
        return toPositiveId(record.honor_id);
      }
      if (
        "honor" in record &&
        record.honor !== null &&
        typeof record.honor === "object"
      ) {
        return toPositiveId((record.honor as Record<string, unknown>).honor_id);
      }
      return undefined;
    })
    .filter((id): id is number => typeof id === "number");

  return Array.from(new Set([...honorIds, ...derived]));
}

function normalizeRequirementGroups(
  groups: unknown[] | undefined,
): MasterHonorRuleGroupPayload[] {
  if (!Array.isArray(groups)) return [];

  return groups.map((group, groupIndex) => {
    if (!group || typeof group !== "object") {
      return {
        group_type: "EXPLICIT_OPTIONS",
        minimum_required: 1,
        display_order: groupIndex + 1,
        options: [],
      };
    }

    const record = group as Record<string, unknown>;
    const groupType = toGroupType(record.group_type);
    const rawOptions = Array.isArray(record.options) ? record.options : [];
    const normalizedOptions: MasterHonorRuleOptionPayload[] = rawOptions.map((option, optionIndex) => {
      if (!option || typeof option !== "object") {
        return {
          label: "",
          display_order: optionIndex + 1,
          honor_ids: [],
          active: true,
        };
      }

      const optionRecord = option as Record<string, unknown>;
      return {
        ...(toPositiveId(optionRecord.option_id)
          ? { option_id: toPositiveId(optionRecord.option_id) }
          : {}),
        label: toText(optionRecord.label) ?? "",
        display_order: toNonNegativeInt(optionRecord.display_order) ?? optionIndex + 1,
        honor_ids: parseHonorIdsFromOption(option),
        ...(typeof optionRecord.active === "boolean"
          ? { active: optionRecord.active }
          : {}),
      };
    });

    return {
      ...(toPositiveId(record.group_id)
        ? { group_id: toPositiveId(record.group_id) }
        : {}),
      group_type: groupType,
      ...(toText(record.title) ? { title: toText(record.title) } : {}),
      ...(toText(record.description) ? { description: toText(record.description) } : {}),
      minimum_required: toPositiveId(record.minimum_required) ?? 1,
      ...(groupType === "CATEGORY_COUNT" && toPositiveId(record.honors_category_id)
        ? { honors_category_id: toPositiveId(record.honors_category_id) }
        : {}),
      display_order: toNonNegativeInt(record.display_order) ?? groupIndex + 1,
      options: groupType === "EXPLICIT_OPTIONS" ? normalizedOptions : [],
      ...(typeof record.active === "boolean" ? { active: record.active } : {}),
    };
  });
}

function normalizePayload(value: MasterHonorPayload): MasterHonorPayload {
  const scope = value.applicability_scope || DEFAULT_SCOPE;
  const division_ids = scope === "SELECTED_DIVISIONS"
    ? parseMasterHonorDivisionIds(value)
    : [];

  return {
    philosophy: value.philosophy,
    notes: value.notes,
    applicability_scope: scope,
    division_ids,
    requirement_groups: normalizeRequirementGroups(value.requirement_groups),
  };
}

function toPositiveInt(value: number) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function MasterHonorRulesEditor({
  value,
  onChange,
  honors,
  honorCategories,
  divisions,
}: MasterHonorRulesEditorProps) {
  const t = useTranslations("catalogs.masterHonors");

  const normalized = useMemo(() => normalizePayload(value), [value]);
  const selectedScope = normalized.applicability_scope;
  const selectedDivisions = new Set(normalized.division_ids ?? []);

  const update = useCallback(
    (patch: MasterHonorPayload) => {
      onChange(normalizePayload(patch));
    },
    [onChange],
  );

  const updateRoot = useCallback(
    (field: keyof MasterHonorPayload, fieldValue: unknown) => {
      update({
        ...normalized,
        [field]: fieldValue,
      });
    },
    [normalized, update],
  );

  const updateGroup = useCallback(
    (groupIndex: number, patch: Record<string, unknown>) => {
      const nextGroups = [...normalized.requirement_groups];
      const current = nextGroups[groupIndex];
      if (!current) return;
      nextGroups[groupIndex] = { ...current, ...patch };
      updateRoot("requirement_groups", nextGroups);
    },
    [normalized, updateRoot],
  );

  const removeGroup = useCallback(
    (groupIndex: number) => {
      const nextGroups = normalized.requirement_groups.filter(
        (_group, index) => index !== groupIndex,
      );
      updateRoot("requirement_groups", nextGroups);
    },
    [normalized, updateRoot],
  );

  const addGroup = useCallback(() => {
    const order = toPositiveInt(normalized.requirement_groups.length) + 1;
    const nextGroups = [
      ...normalized.requirement_groups,
      {
        group_type: "EXPLICIT_OPTIONS",
        minimum_required: 1,
        display_order: order,
        options: [
          {
            label: "",
            display_order: 1,
            honor_ids: [],
            active: true,
          },
        ],
      },
    ];
    updateRoot("requirement_groups", nextGroups);
  }, [normalized, updateRoot]);

  const addOption = useCallback(
    (groupIndex: number) => {
      const nextGroups = [...normalized.requirement_groups];
      const group = nextGroups[groupIndex];
      if (!group || group.group_type !== "EXPLICIT_OPTIONS") return;
      const nextDisplayOrder = toPositiveInt(group.options.length) + 1;
      nextGroups[groupIndex] = {
        ...group,
        options: [
          ...group.options,
          {
            label: "",
            display_order: nextDisplayOrder,
            honor_ids: [],
            active: true,
          },
        ],
      };
      updateRoot("requirement_groups", nextGroups);
    },
    [normalized, updateRoot],
  );

  const removeOption = useCallback(
    (groupIndex: number, optionIndex: number) => {
      const nextGroups = [...normalized.requirement_groups];
      const group = nextGroups[groupIndex];
      if (!group || group.group_type !== "EXPLICIT_OPTIONS") return;
      nextGroups[groupIndex] = {
        ...group,
        options: group.options.filter((_option, index) => index !== optionIndex),
      };
      updateRoot("requirement_groups", nextGroups);
    },
    [normalized, updateRoot],
  );

  const updateOption = useCallback(
    (groupIndex: number, optionIndex: number, patch: Record<string, unknown>) => {
      const nextGroups = [...normalized.requirement_groups];
      const group = nextGroups[groupIndex];
      if (!group || group.group_type !== "EXPLICIT_OPTIONS") return;
      const nextOptions = [...group.options];
      const option = nextOptions[optionIndex];
      if (!option) return;
      nextOptions[optionIndex] = { ...option, ...patch };
      nextGroups[groupIndex] = { ...group, options: nextOptions };
      updateRoot("requirement_groups", nextGroups);
    },
    [normalized, updateRoot],
  );

  const toggleDivision = useCallback(
    (divisionId: number, checked: boolean) => {
      const next = new Set(normalized.division_ids ?? []);
      if (checked) {
        next.add(divisionId);
      } else {
        next.delete(divisionId);
      }
      updateRoot("division_ids", Array.from(next));
    },
    [normalized.division_ids, updateRoot],
  );

  const toggleHonorId = useCallback(
    (groupIndex: number, optionIndex: number, honorId: number, checked: boolean) => {
      const nextGroups = [...normalized.requirement_groups];
      const group = nextGroups[groupIndex];
      if (!group || group.group_type !== "EXPLICIT_OPTIONS") return;
      const nextOptions = [...group.options];
      const option = nextOptions[optionIndex];
      if (!option) return;
      const ids = new Set(option.honor_ids ?? []);
      if (checked) {
        ids.add(honorId);
      } else {
        ids.delete(honorId);
      }
      nextOptions[optionIndex] = { ...option, honor_ids: Array.from(ids) };
      nextGroups[groupIndex] = { ...group, options: nextOptions };
      updateRoot("requirement_groups", nextGroups);
    },
    [normalized, updateRoot],
  );

  return (
    <div className="space-y-6 rounded-lg border bg-muted/20 p-4">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t("rulesTitle")}</h3>

        <div className="space-y-2">
          <Label htmlFor="master-honor-philosophy">{t("fieldPhilosophy")}</Label>
          <Textarea
            id="master-honor-philosophy"
            name="philosophy"
            rows={3}
            value={normalized.philosophy ?? ""}
            onChange={(event) => updateRoot("philosophy", event.target.value)}
            placeholder={t("fieldPhilosophyPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="master-honor-notes">{t("fieldNotes")}</Label>
          <Textarea
            id="master-honor-notes"
            name="notes"
            rows={3}
            value={normalized.notes ?? ""}
            onChange={(event) => updateRoot("notes", event.target.value)}
            placeholder={t("fieldNotesPlaceholder")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="master-honor-scope">{t("fieldApplicabilityScope")}</Label>
            <Select
              value={selectedScope}
              onValueChange={(value: "ALL" | "SELECTED_DIVISIONS") => {
                const nextDivisions = value === "ALL"
                  ? []
                  : normalized.division_ids ?? [];
                update({
                  ...normalized,
                  applicability_scope: value,
                  division_ids: nextDivisions,
                });
              }}
            >
              <SelectTrigger id="master-honor-scope" className="w-full bg-background">
                <SelectValue placeholder={t("scopeSelectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("scopeAll")}</SelectItem>
                <SelectItem value="SELECTED_DIVISIONS">{t("scopeSelected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("warningRecalculate")}</p>
          </div>
        </div>

        {selectedScope === "SELECTED_DIVISIONS" ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">{t("fieldDivisions")}</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {divisions.map((division) => {
                const id = division.division_id;
                return (
                  <label
                    key={id}
                    htmlFor={`scope-division-${id}`}
                    className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <Checkbox
                      id={`scope-division-${id}`}
                      checked={selectedDivisions.has(id)}
                      onCheckedChange={(checked) => {
                        toggleDivision(id, Boolean(checked));
                      }}
                    />
                    <span>{division.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">{t("rulesGroupsTitle")}</h4>
            <p className="text-xs text-muted-foreground">{t("rulesGroupsDescription")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGroup}
          >
            <Plus className="size-3.5" />
            {t("buttonAddGroup")}
          </Button>
        </div>

        <div className="space-y-3">
          {normalized.requirement_groups.map((group, groupIndex) => {
            const activeOptions = group.options.filter(
              (option) => option.active !== false,
            ).length;
            const minTooHigh =
              group.group_type === "EXPLICIT_OPTIONS" &&
              group.minimum_required > activeOptions;
            const activeTypeCount =
              group.group_type === "EXPLICIT_OPTIONS"
                ? `(${activeOptions})`
                : "";

            return (
              <div
                key={`${groupIndex}-${group.group_type}-${group.display_order}-${group.title ?? ""}`}
                className="space-y-4 rounded-md border bg-background p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-sm font-semibold">
                    {t("groupLabel", { index: groupIndex + 1 })}
                  </h5>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeGroup(groupIndex)}
                  >
                    <Minus className="size-3.5" />
                    {t("buttonRemoveGroup")}
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("fieldGroupType")}</Label>
                    <Select
                      value={group.group_type}
                      onValueChange={(value: "EXPLICIT_OPTIONS" | "CATEGORY_COUNT") => {
                        if (value === group.group_type) return;
                        if (value === "CATEGORY_COUNT") {
                          updateGroup(groupIndex, {
                            group_type: value,
                            honors_category_id: undefined,
                            options: [],
                          });
                        } else {
                          updateGroup(groupIndex, {
                            group_type: value,
                            honors_category_id: undefined,
                            options: [
                              {
                                label: "",
                                display_order: 1,
                                honor_ids: [],
                                active: true,
                              },
                            ],
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPLICIT_OPTIONS">{t("groupTypeExplicit")}</SelectItem>
                        <SelectItem value="CATEGORY_COUNT">{t("groupTypeCategory")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`group-min-required-${groupIndex}`}>
                      {t("fieldMinimumRequired")}
                    </Label>
                    <Input
                      id={`group-min-required-${groupIndex}`}
                      type="number"
                      min={1}
                      value={String(group.minimum_required ?? 1)}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        updateGroup(groupIndex, {
                          minimum_required: Number.isFinite(next) && next > 0
                            ? next
                            : 1,
                        });
                      }}
                    />
                    {minTooHigh ? (
                      <p className="text-xs text-destructive">
                        {t("validationMinTooHigh", { index: groupIndex + 1, count: activeOptions })}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {t("fieldMinimumRequiredHint", { activeCount: activeTypeCount })}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`group-order-${groupIndex}`}>{t("fieldDisplayOrder")}</Label>
                    <Input
                      id={`group-order-${groupIndex}`}
                      type="number"
                      min={0}
                      value={String(group.display_order ?? 0)}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        updateGroup(groupIndex, {
                          display_order: Number.isFinite(next)
                            ? next
                            : 0,
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`group-title-${groupIndex}`}>{t("fieldGroupTitle")}</Label>
                    <Input
                      id={`group-title-${groupIndex}`}
                      value={group.title ?? ""}
                      onChange={(event) =>
                        updateGroup(groupIndex, { title: event.target.value })
                      }
                      placeholder={t("fieldGroupTitlePlaceholder")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`group-description-${groupIndex}`}>{t("fieldGroupDescription")}</Label>
                  <Textarea
                    id={`group-description-${groupIndex}`}
                    rows={2}
                    value={group.description ?? ""}
                    onChange={(event) =>
                      updateGroup(groupIndex, { description: event.target.value })
                    }
                    placeholder={t("fieldGroupDescriptionPlaceholder")}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={group.active !== false}
                    onCheckedChange={(checked) =>
                      updateGroup(groupIndex, { active: Boolean(checked) })
                    }
                  />
                  {t("fieldActive")}
                </label>

                {group.group_type === "CATEGORY_COUNT" ? (
                  <div className="space-y-2">
                    <Label htmlFor={`group-category-${groupIndex}`}>{t("fieldHonorCategory")}</Label>
                    <Select
                      value={group.honors_category_id ? String(group.honors_category_id) : ""}
                      onValueChange={(value) => {
                        const next = Number(value);
                        updateGroup(groupIndex, {
                          honors_category_id: Number.isFinite(next) && next > 0
                            ? next
                            : undefined,
                        });
                      }}
                    >
                      <SelectTrigger id={`group-category-${groupIndex}`} className="bg-background">
                        <SelectValue placeholder={t("fieldHonorCategoryPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {honorCategories.map((category) => (
                          <SelectItem
                            key={category.honor_category_id}
                            value={String(category.honor_category_id)}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {group.group_type === "EXPLICIT_OPTIONS" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{t("optionsTitle")}</p>
                        <p className="text-xs text-muted-foreground">{t("optionsDescription")}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(groupIndex)}
                      >
                        <Plus className="size-3.5" />
                        {t("buttonAddOption")}
                      </Button>
                    </div>

                    {group.options.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noOptions")}</p>
                    ) : (
                      group.options.map((option, optionIndex) => {
                        const optionHonorIds = new Set(option.honor_ids ?? []);
                        return (
                          <div
                            key={`${groupIndex}-${optionIndex}-${option.display_order}-${option.label}`}
                            className="rounded-md border bg-muted/20 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="text-sm font-medium">
                                {t("optionLabel", {
                                  index: optionIndex + 1,
                                  honorCount: optionHonorIds.size,
                                })}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(groupIndex, optionIndex)}
                                className="text-destructive"
                              >
                                <Minus className="size-3.5" />
                                {t("buttonRemoveOption")}
                              </Button>
                            </div>

                            <div className="grid gap-2 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>{t("fieldOptionLabel")}</Label>
                                <Input
                                  value={option.label}
                                  onChange={(event) =>
                                    updateOption(groupIndex, optionIndex, {
                                      label: event.target.value,
                                    })
                                  }
                                  placeholder={t("fieldOptionLabelPlaceholder")}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("fieldOptionOrder")}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={String(option.display_order ?? 0)}
                                  onChange={(event) =>
                                    updateOption(groupIndex, optionIndex, {
                                      display_order: Number(event.target.value) || 0,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <label className="mt-3 flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={option.active !== false}
                                onCheckedChange={(checked) =>
                                  updateOption(groupIndex, optionIndex, {
                                    active: Boolean(checked),
                                  })
                                }
                              />
                              {t("fieldOptionActive")}
                            </label>

                            <div className="mt-3 space-y-2">
                              <p className="text-sm">{t("fieldOptionHonorIds")}</p>
                              <div className="grid max-h-44 gap-2 overflow-auto rounded border bg-background p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {honors.map((honor) => {
                                  const honorId = honor.honor_id;
                                  const checked = optionHonorIds.has(honorId);
                                  return (
                                    <label
                                      key={honorId}
                                      htmlFor={`option-${groupIndex}-${optionIndex}-${honorId}`}
                                      className="flex items-center gap-2"
                                    >
                                      <Checkbox
                                        id={`option-${groupIndex}-${optionIndex}-${honorId}`}
                                        checked={checked}
                                        onCheckedChange={(next) =>
                                          toggleHonorId(
                                            groupIndex,
                                            optionIndex,
                                            honorId,
                                            Boolean(next),
                                          )
                                        }
                                      />
                                      <span>{honor.name}</span>
                                    </label>
                                  );
                                })}
                                {honors.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    {t("noHonors")}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {normalized.requirement_groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noGroups")}</p>
        ) : null}
      </div>

      <input
        type="hidden"
        name="master_honor_payload"
        value={JSON.stringify(normalized)}
      />
    </div>
  );
}
