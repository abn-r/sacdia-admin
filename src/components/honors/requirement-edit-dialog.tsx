"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, PenLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import {
  createRequirement,
  updateRequirement,
  type CreateRequirementPayload,
  type RequirementNode,
  type UpdateRequirementPayload,
} from "@/lib/api/honors";

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogMode = "create" | "edit";

interface RequirementEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogMode;
  honorId: number;
  /** Next sequential number — used for create only */
  nextNumber?: number;
  /** parentId — used when creating a sub-item */
  parentId?: number | null;
  /** Existing requirement — used in edit mode */
  requirement?: RequirementNode | null;
  onSuccess: () => void;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  displayLabel: string;
  requirementText: string;
  referenceText: string;
  showReference: boolean;
  isChoiceGroup: boolean;
  choiceMin: string;
  requiresEvidence: boolean;
  needsReview: boolean;
}

function buildInitialState(
  mode: DialogMode,
  requirement?: RequirementNode | null,
): FormState {
  if (mode === "edit" && requirement) {
    return {
      displayLabel: requirement.display_label ?? "",
      requirementText: requirement.requirement_text,
      referenceText: requirement.reference_text ?? "",
      showReference: Boolean(requirement.reference_text),
      isChoiceGroup: requirement.is_choice_group,
      choiceMin: requirement.choice_min !== null ? String(requirement.choice_min) : "",
      requiresEvidence: requirement.requires_evidence,
      needsReview: requirement.needs_review,
    };
  }
  return {
    displayLabel: "",
    requirementText: "",
    referenceText: "",
    showReference: false,
    isChoiceGroup: false,
    choiceMin: "",
    requiresEvidence: false,
    needsReview: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequirementEditDialog({
  open,
  onOpenChange,
  mode,
  honorId,
  nextNumber = 1,
  parentId = null,
  requirement = null,
  onSuccess,
}: RequirementEditDialogProps) {
  const isEdit = mode === "edit";
  const t = useTranslations("honors");

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(mode, requirement),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form state whenever the dialog opens or the target requirement changes.
  useEffect(() => {
    if (open) {
      setForm(buildInitialState(mode, requirement));
      setError(null);
    }
  }, [open, mode, requirement]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedText = form.requirementText.trim();
    if (!trimmedText) {
      setError("El texto del requisito es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit && requirement) {
        const payload: UpdateRequirementPayload = {
          displayLabel: form.displayLabel.trim() || null,
          requirementText: trimmedText,
          referenceText: form.referenceText.trim() || null,
          isChoiceGroup: form.isChoiceGroup,
          choiceMin:
            form.isChoiceGroup && form.choiceMin !== ""
              ? Number(form.choiceMin)
              : null,
          requiresEvidence: form.requiresEvidence,
          needsReview: form.needsReview,
        };
        await updateRequirement(requirement.requirement_id, payload);
      } else {
        const payload: CreateRequirementPayload = {
          parentId: parentId ?? null,
          requirementNumber: nextNumber,
          displayLabel: form.displayLabel.trim() || null,
          requirementText: trimmedText,
          referenceText: form.referenceText.trim() || null,
          isChoiceGroup: form.isChoiceGroup,
          choiceMin:
            form.isChoiceGroup && form.choiceMin !== ""
              ? Number(form.choiceMin)
              : null,
          requiresEvidence: form.requiresEvidence,
        };
        await createRequirement(honorId, payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.unexpected");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const titleLabel = isEdit
    ? "Editar requisito"
    : parentId
      ? "Agregar sub-requisito"
      : "Agregar requisito";

  const descriptionLabel = isEdit
    ? "Modificá los campos del requisito."
    : parentId
      ? "Completá los datos del nuevo sub-requisito."
      : "Completá los datos del nuevo requisito.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              {isEdit ? (
                <PenLine className="size-5 text-muted-foreground" />
              ) : (
                <Plus className="size-5 text-muted-foreground" />
              )}
              {titleLabel}
            </span>
          </DialogTitle>
          <DialogDescription>{descriptionLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          {/* Display label */}
          <div className="space-y-1.5">
            <Label htmlFor="displayLabel" className="text-sm font-medium">
              Etiqueta de visualización{" "}
              <span className="text-muted-foreground">(máx. 10 caracteres)</span>
            </Label>
            <Input
              id="displayLabel"
              value={form.displayLabel}
              onChange={(e) =>
                set("displayLabel", e.target.value.slice(0, 10))
              }
              placeholder="Ej: 1, 1a, A.1"
              maxLength={10}
            />
          </div>

          {/* Requirement text */}
          <div className="space-y-1.5">
            <Label htmlFor="requirementText" className="text-sm font-medium">
              Texto del requisito <span className="text-destructive/70">*</span>
            </Label>
            <Textarea
              id="requirementText"
              value={form.requirementText}
              onChange={(e) => set("requirementText", e.target.value)}
              placeholder="Describe el requisito..."
              rows={4}
              className="min-h-[90px] resize-none"
              required
            />
          </div>

          {/* Reference text — collapsible */}
          <div className="space-y-1.5">
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline focus:outline-none"
              onClick={() => set("showReference", !form.showReference)}
            >
              {form.showReference
                ? "Ocultar referencia bibliográfica"
                : "Agregar referencia bibliográfica"}
            </button>
            {form.showReference && (
              <Textarea
                id="referenceText"
                value={form.referenceText}
                onChange={(e) => set("referenceText", e.target.value)}
                placeholder="Ej: Libro de Especialidades, págs. 45-50"
                rows={3}
                className="min-h-[70px] resize-none"
              />
            )}
          </div>

          {/* Toggle row */}
          <div className="space-y-3">
            {/* Is choice group */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isChoiceGroup" className="text-sm font-medium">
                  Grupo de opciones
                </Label>
                <p className="text-[13px] text-muted-foreground">
                  El club elige N de los sub-requisitos.
                </p>
              </div>
              <Switch
                id="isChoiceGroup"
                checked={form.isChoiceGroup}
                onCheckedChange={(v) => set("isChoiceGroup", v)}
              />
            </div>

            {/* Choice min — only when isChoiceGroup is true */}
            {form.isChoiceGroup && (
              <div className="space-y-1.5 pl-0">
                <Label htmlFor="choiceMin" className="text-sm font-medium">
                  Mínimo de opciones requeridas
                </Label>
                <Input
                  id="choiceMin"
                  type="number"
                  min={1}
                  value={form.choiceMin}
                  onChange={(e) => set("choiceMin", e.target.value)}
                  placeholder="Ej: 2"
                  className="w-32"
                />
              </div>
            )}

            {/* Requires evidence */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requiresEvidence" className="text-sm font-medium">
                  Requiere evidencia
                </Label>
                <p className="text-[13px] text-muted-foreground">
                  El miembro debe adjuntar un archivo como comprobante.
                </p>
              </div>
              <Switch
                id="requiresEvidence"
                checked={form.requiresEvidence}
                onCheckedChange={(v) => set("requiresEvidence", v)}
              />
            </div>

            {/* Needs review — only in edit mode */}
            {isEdit && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="needsReview" className="text-sm font-medium">
                    Pendiente de revisión
                  </Label>
                  <p className="text-[13px] text-muted-foreground">
                    Marca el requisito para ser revisado por un coordinador.
                  </p>
                </div>
                <Switch
                  id="needsReview"
                  checked={form.needsReview}
                  onCheckedChange={(v) => set("needsReview", v)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  {isEdit ? (
                    <Check className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {isEdit ? "Guardar cambios" : "Agregar"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
