"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  replaceCertificationTree,
  CERTIFICATION_COMPONENT_TYPES,
  type AdminCertificationModule,
  type CertificationComponentType,
  type UpsertModuleInput,
} from "@/lib/api/certifications";

// ─── Editable (client-only) shapes ─────────────────────────────────────────

type EditableComponent = {
  _key: string;
  component_type: CertificationComponentType;
  label: string;
  instructions: string;
  required: boolean;
  min_length: string;
  max_length: string;
  max_files: string;
  allowed_mime_types: string;
  statement: string;
  criteria: string;
  honor_id: string;
  activity_type_id: string;
};

type EditableSection = {
  _key: string;
  name: string;
  description: string;
  instructions: string;
  required: boolean;
  components: EditableComponent[];
};

type EditableModule = {
  _key: string;
  name: string;
  description: string;
  sections: EditableSection[];
};

function emptyComponent(key: string): EditableComponent {
  return {
    _key: key,
    component_type: "TEXT_RESPONSE",
    label: "",
    instructions: "",
    required: true,
    min_length: "",
    max_length: "",
    max_files: "",
    allowed_mime_types: "",
    statement: "",
    criteria: "",
    honor_id: "",
    activity_type_id: "",
  };
}

function emptySection(key: string): EditableSection {
  return {
    _key: key,
    name: "",
    description: "",
    instructions: "",
    required: true,
    components: [],
  };
}

function emptyModule(key: string): EditableModule {
  return { _key: key, name: "", description: "", sections: [] };
}

function toEditableModules(modules: AdminCertificationModule[], nextKey: () => string): EditableModule[] {
  return modules.map((module) => ({
    _key: nextKey(),
    name: module.name,
    description: module.description ?? "",
    sections: (module.certification_sections ?? []).map((section) => ({
      _key: nextKey(),
      name: section.name,
      description: section.description ?? "",
      instructions: section.instructions ?? "",
      required: section.required ?? true,
      components: (section.certification_requirement_components ?? []).map((component) => {
        const config = (component.configuration ?? {}) as Record<string, unknown>;
        return {
          _key: nextKey(),
          component_type: component.component_type,
          label: component.label,
          instructions: component.instructions ?? "",
          required: component.required ?? true,
          min_length: typeof config.min_length === "number" ? String(config.min_length) : "",
          max_length: typeof config.max_length === "number" ? String(config.max_length) : "",
          max_files: typeof config.max_files === "number" ? String(config.max_files) : "",
          allowed_mime_types: Array.isArray(config.allowed_mime_types)
            ? (config.allowed_mime_types as unknown[]).join(", ")
            : "",
          statement: typeof config.statement === "string" ? config.statement : "",
          criteria: typeof config.criteria === "string" ? config.criteria : "",
          honor_id: component.honor_id != null ? String(component.honor_id) : "",
          activity_type_id:
            component.activity_type_id != null ? String(component.activity_type_id) : "",
        };
      }),
    })),
  }));
}

// ─── Component ──────────────────────────────────────────────────────────────

interface CertificationTreeEditorProps {
  certificationId: number;
  versionId: number;
  modules: AdminCertificationModule[];
  readOnly: boolean;
  onSaved: (modules: AdminCertificationModule[]) => void;
}

export function CertificationTreeEditor({
  certificationId,
  versionId,
  modules,
  readOnly,
  onSaved,
}: CertificationTreeEditorProps) {
  const t = useTranslations("certificationsAdmin.tree");
  const keyCounter = useRef(0);
  const nextKey = () => `node-${keyCounter.current++}`;

  const [localModules, setLocalModules] = useState<EditableModule[]>(() =>
    toEditableModules(modules, nextKey),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalModules(toEditableModules(modules, nextKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  function updateModule(moduleIdx: number, patch: Partial<EditableModule>) {
    setLocalModules((prev) =>
      prev.map((m, i) => (i === moduleIdx ? { ...m, ...patch } : m)),
    );
  }

  function moveModule(moduleIdx: number, direction: -1 | 1) {
    setLocalModules((prev) => {
      const target = moduleIdx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[moduleIdx], next[target]] = [next[target], next[moduleIdx]];
      return next;
    });
  }

  function addModule() {
    setLocalModules((prev) => [...prev, emptyModule(nextKey())]);
  }

  function removeModule(moduleIdx: number) {
    setLocalModules((prev) => prev.filter((_, i) => i !== moduleIdx));
  }

  function updateSection(moduleIdx: number, sectionIdx: number, patch: Partial<EditableSection>) {
    setLocalModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIdx) return m;
        return {
          ...m,
          sections: m.sections.map((s, j) => (j === sectionIdx ? { ...s, ...patch } : s)),
        };
      }),
    );
  }

  function moveSection(moduleIdx: number, sectionIdx: number, direction: -1 | 1) {
    setLocalModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIdx) return m;
        const target = sectionIdx + direction;
        if (target < 0 || target >= m.sections.length) return m;
        const sections = [...m.sections];
        [sections[sectionIdx], sections[target]] = [sections[target], sections[sectionIdx]];
        return { ...m, sections };
      }),
    );
  }

  function addSection(moduleIdx: number) {
    setLocalModules((prev) =>
      prev.map((m, i) =>
        i === moduleIdx ? { ...m, sections: [...m.sections, emptySection(nextKey())] } : m,
      ),
    );
  }

  function removeSection(moduleIdx: number, sectionIdx: number) {
    setLocalModules((prev) =>
      prev.map((m, i) =>
        i === moduleIdx
          ? { ...m, sections: m.sections.filter((_, j) => j !== sectionIdx) }
          : m,
      ),
    );
  }

  function updateComponent(
    moduleIdx: number,
    sectionIdx: number,
    componentIdx: number,
    patch: Partial<EditableComponent>,
  ) {
    setLocalModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIdx) return m;
        return {
          ...m,
          sections: m.sections.map((s, j) => {
            if (j !== sectionIdx) return s;
            return {
              ...s,
              components: s.components.map((c, k) =>
                k === componentIdx ? { ...c, ...patch } : c,
              ),
            };
          }),
        };
      }),
    );
  }

  function moveComponent(
    moduleIdx: number,
    sectionIdx: number,
    componentIdx: number,
    direction: -1 | 1,
  ) {
    setLocalModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIdx) return m;
        return {
          ...m,
          sections: m.sections.map((s, j) => {
            if (j !== sectionIdx) return s;
            const target = componentIdx + direction;
            if (target < 0 || target >= s.components.length) return s;
            const components = [...s.components];
            [components[componentIdx], components[target]] = [
              components[target],
              components[componentIdx],
            ];
            return { ...s, components };
          }),
        };
      }),
    );
  }

  function addComponent(moduleIdx: number, sectionIdx: number) {
    setLocalModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIdx) return m;
        return {
          ...m,
          sections: m.sections.map((s, j) =>
            j === sectionIdx
              ? { ...s, components: [...s.components, emptyComponent(nextKey())] }
              : s,
          ),
        };
      }),
    );
  }

  function removeComponent(moduleIdx: number, sectionIdx: number, componentIdx: number) {
    setLocalModules((prev) =>
      prev.map((m, i) => {
        if (i !== moduleIdx) return m;
        return {
          ...m,
          sections: m.sections.map((s, j) =>
            j === sectionIdx
              ? { ...s, components: s.components.filter((_, k) => k !== componentIdx) }
              : s,
          ),
        };
      }),
    );
  }

  function validate(): string | null {
    if (localModules.length === 0) return null;
    for (const mod of localModules) {
      if (!mod.name.trim()) return t("validation.moduleNameRequired");
      for (const section of mod.sections) {
        if (!section.name.trim()) return t("validation.sectionNameRequired");
        for (const component of section.components) {
          if (!component.label.trim()) return t("validation.componentLabelRequired");
          if (component.component_type === "LINKED_HONOR" && !component.honor_id.trim()) {
            return t("validation.honorIdRequired");
          }
          if (
            component.component_type === "LINKED_ACTIVITY" &&
            !component.activity_type_id.trim()
          ) {
            return t("validation.activityTypeIdRequired");
          }
          if (component.component_type === "ATTESTATION" && !component.statement.trim()) {
            return t("validation.statementRequired");
          }
          if (component.component_type === "AUTO_VALIDATION" && !component.criteria.trim()) {
            return t("validation.criteriaRequired");
          }
        }
      }
    }
    return null;
  }

  function buildConfiguration(component: EditableComponent): Record<string, unknown> {
    switch (component.component_type) {
      case "TEXT_RESPONSE": {
        const config: Record<string, unknown> = {};
        if (component.min_length.trim()) config.min_length = Number(component.min_length);
        if (component.max_length.trim()) config.max_length = Number(component.max_length);
        return config;
      }
      case "FILE_EVIDENCE": {
        const config: Record<string, unknown> = {};
        if (component.max_files.trim()) config.max_files = Number(component.max_files);
        if (component.allowed_mime_types.trim()) {
          config.allowed_mime_types = component.allowed_mime_types
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        }
        return config;
      }
      case "ATTESTATION":
        return { statement: component.statement.trim() };
      case "AUTO_VALIDATION":
        return { criteria: component.criteria.trim() };
      default:
        return {};
    }
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload: UpsertModuleInput[] = localModules.map((module, moduleIndex) => ({
      name: module.name.trim(),
      description: module.description.trim() || undefined,
      sort_order: moduleIndex,
      sections: module.sections.map((section, sectionIndex) => ({
        name: section.name.trim(),
        description: section.description.trim() || undefined,
        instructions: section.instructions.trim() || undefined,
        required: section.required,
        sort_order: sectionIndex,
        components: section.components.map((component, componentIndex) => ({
          component_type: component.component_type,
          label: component.label.trim(),
          instructions: component.instructions.trim() || undefined,
          required: component.required,
          sort_order: componentIndex,
          configuration: buildConfiguration(component),
          honor_id:
            component.component_type === "LINKED_HONOR" ? Number(component.honor_id) : undefined,
          activity_type_id:
            component.component_type === "LINKED_ACTIVITY"
              ? Number(component.activity_type_id)
              : undefined,
        })),
      })),
    }));

    setIsSaving(true);
    try {
      const saved = await replaceCertificationTree(certificationId, versionId, payload);
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
          <Button type="button" variant="outline" size="sm" onClick={addModule}>
            <Plus className="size-4" />
            {t("addModule")}
          </Button>
        )}
      </div>

      {localModules.length === 0 ? (
        <EmptyState icon={Layers} title={t("empty")} />
      ) : (
        <div className="space-y-4">
          {localModules.map((module, moduleIdx) => (
            <div key={module._key} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`module-name-${module._key}`}>{t("fields.moduleName")}</Label>
                  <Input
                    id={`module-name-${module._key}`}
                    disabled={readOnly}
                    value={module.name}
                    onChange={(e) => updateModule(moduleIdx, { name: e.target.value })}
                    placeholder={t("fields.moduleNamePlaceholder")}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`module-desc-${module._key}`}>
                    {t("fields.description")}
                  </Label>
                  <Input
                    id={`module-desc-${module._key}`}
                    disabled={readOnly}
                    value={module.description}
                    onChange={(e) => updateModule(moduleIdx, { description: e.target.value })}
                  />
                </div>
                {!readOnly && (
                  <div className="flex shrink-0 gap-1 pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={moduleIdx === 0}
                      onClick={() => moveModule(moduleIdx, -1)}
                      aria-label={t("moveUp")}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={moduleIdx === localModules.length - 1}
                      onClick={() => moveModule(moduleIdx, 1)}
                      aria-label={t("moveDown")}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeModule(moduleIdx)}
                      aria-label={t("remove")}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-3 border-t border-border/60 pt-3 pl-3">
                {module.sections.map((section, sectionIdx) => (
                  <div
                    key={section._key}
                    className="rounded-md border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor={`section-name-${section._key}`}>
                          {t("fields.sectionName")}
                        </Label>
                        <Input
                          id={`section-name-${section._key}`}
                          disabled={readOnly}
                          value={section.name}
                          onChange={(e) =>
                            updateSection(moduleIdx, sectionIdx, { name: e.target.value })
                          }
                          placeholder={t("fields.sectionNamePlaceholder")}
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor={`section-instructions-${section._key}`}>
                          {t("fields.instructions")}
                        </Label>
                        <Input
                          id={`section-instructions-${section._key}`}
                          disabled={readOnly}
                          value={section.instructions}
                          onChange={(e) =>
                            updateSection(moduleIdx, sectionIdx, {
                              instructions: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-2 pt-6">
                        <Checkbox
                          id={`section-required-${section._key}`}
                          checked={section.required}
                          disabled={readOnly}
                          onCheckedChange={(checked) =>
                            updateSection(moduleIdx, sectionIdx, { required: checked === true })
                          }
                        />
                        <Label htmlFor={`section-required-${section._key}`} className="font-normal">
                          {t("fields.required")}
                        </Label>
                      </div>
                      {!readOnly && (
                        <div className="flex shrink-0 gap-1 pt-6">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={sectionIdx === 0}
                            onClick={() => moveSection(moduleIdx, sectionIdx, -1)}
                            aria-label={t("moveUp")}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={sectionIdx === module.sections.length - 1}
                            onClick={() => moveSection(moduleIdx, sectionIdx, 1)}
                            aria-label={t("moveDown")}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeSection(moduleIdx, sectionIdx)}
                            aria-label={t("remove")}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-2 border-t border-border/50 pt-2 pl-3">
                      {section.components.map((component, componentIdx) => (
                        <div
                          key={component._key}
                          className="space-y-2 rounded-md border border-border/60 bg-background p-2.5"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                            <div className="flex-1 space-y-1.5">
                              <Label htmlFor={`component-type-${component._key}`}>
                                {t("fields.componentType")}
                              </Label>
                              <Select
                                value={component.component_type}
                                disabled={readOnly}
                                onValueChange={(value) =>
                                  updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                    component_type: value as CertificationComponentType,
                                  })
                                }
                              >
                                <SelectTrigger id={`component-type-${component._key}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CERTIFICATION_COMPONENT_TYPES.map((componentType) => (
                                    <SelectItem key={componentType} value={componentType}>
                                      {t(`componentTypeLabels.${componentType}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <Label htmlFor={`component-label-${component._key}`}>
                                {t("fields.label")}
                              </Label>
                              <Input
                                id={`component-label-${component._key}`}
                                disabled={readOnly}
                                value={component.label}
                                onChange={(e) =>
                                  updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                    label: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="flex shrink-0 items-center gap-2 pt-6">
                              <Checkbox
                                id={`component-required-${component._key}`}
                                checked={component.required}
                                disabled={readOnly}
                                onCheckedChange={(checked) =>
                                  updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                    required: checked === true,
                                  })
                                }
                              />
                              <Label
                                htmlFor={`component-required-${component._key}`}
                                className="font-normal"
                              >
                                {t("fields.required")}
                              </Label>
                            </div>
                            {!readOnly && (
                              <div className="flex shrink-0 gap-1 pt-6">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={componentIdx === 0}
                                  onClick={() =>
                                    moveComponent(moduleIdx, sectionIdx, componentIdx, -1)
                                  }
                                  aria-label={t("moveUp")}
                                >
                                  <ArrowUp className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={componentIdx === section.components.length - 1}
                                  onClick={() =>
                                    moveComponent(moduleIdx, sectionIdx, componentIdx, 1)
                                  }
                                  aria-label={t("moveDown")}
                                >
                                  <ArrowDown className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() =>
                                    removeComponent(moduleIdx, sectionIdx, componentIdx)
                                  }
                                  aria-label={t("remove")}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <Textarea
                            disabled={readOnly}
                            placeholder={t("fields.instructions")}
                            value={component.instructions}
                            onChange={(e) =>
                              updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                instructions: e.target.value,
                              })
                            }
                            rows={2}
                          />

                          {component.component_type === "TEXT_RESPONSE" && (
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                min={0}
                                disabled={readOnly}
                                placeholder={t("fields.minLength")}
                                value={component.min_length}
                                onChange={(e) =>
                                  updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                    min_length: e.target.value,
                                  })
                                }
                              />
                              <Input
                                type="number"
                                min={0}
                                disabled={readOnly}
                                placeholder={t("fields.maxLength")}
                                value={component.max_length}
                                onChange={(e) =>
                                  updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                    max_length: e.target.value,
                                  })
                                }
                              />
                            </div>
                          )}
                          {component.component_type === "FILE_EVIDENCE" && (
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                min={1}
                                disabled={readOnly}
                                placeholder={t("fields.maxFiles")}
                                value={component.max_files}
                                onChange={(e) =>
                                  updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                    max_files: e.target.value,
                                  })
                                }
                              />
                              <Input
                                disabled={readOnly}
                                placeholder={t("fields.allowedMimeTypes")}
                                value={component.allowed_mime_types}
                                onChange={(e) =>
                                  updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                    allowed_mime_types: e.target.value,
                                  })
                                }
                              />
                            </div>
                          )}
                          {component.component_type === "LINKED_HONOR" && (
                            <Input
                              type="number"
                              min={1}
                              disabled={readOnly}
                              placeholder={t("fields.honorId")}
                              value={component.honor_id}
                              onChange={(e) =>
                                updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                  honor_id: e.target.value,
                                })
                              }
                            />
                          )}
                          {component.component_type === "LINKED_ACTIVITY" && (
                            <Input
                              type="number"
                              min={1}
                              disabled={readOnly}
                              placeholder={t("fields.activityTypeId")}
                              value={component.activity_type_id}
                              onChange={(e) =>
                                updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                  activity_type_id: e.target.value,
                                })
                              }
                            />
                          )}
                          {component.component_type === "ATTESTATION" && (
                            <Textarea
                              disabled={readOnly}
                              placeholder={t("fields.statement")}
                              value={component.statement}
                              onChange={(e) =>
                                updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                  statement: e.target.value,
                                })
                              }
                              rows={2}
                            />
                          )}
                          {component.component_type === "AUTO_VALIDATION" && (
                            <Textarea
                              disabled={readOnly}
                              placeholder={t("fields.criteria")}
                              value={component.criteria}
                              onChange={(e) =>
                                updateComponent(moduleIdx, sectionIdx, componentIdx, {
                                  criteria: e.target.value,
                                })
                              }
                              rows={2}
                            />
                          )}
                        </div>
                      ))}

                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addComponent(moduleIdx, sectionIdx)}
                        >
                          <Plus className="size-4" />
                          {t("addComponent")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addSection(moduleIdx)}
                  >
                    <Plus className="size-4" />
                    {t("addSection")}
                  </Button>
                )}
              </div>
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
