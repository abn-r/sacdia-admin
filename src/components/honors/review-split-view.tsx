"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  deleteRequirement,
  updateRequirement,
  type ReviewRequirement,
} from "@/lib/api/honors";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ReviewAction =
  | { type: "approve"; requirementId: number }
  | { type: "edit-approve"; requirementId: number }
  | { type: "reject"; requirementId: number };

interface ReviewFormState {
  displayLabel: string;
  requirementText: string;
  referenceText: string;
  showReference: boolean;
  requiresEvidence: boolean;
}

function buildInitialForm(req: ReviewRequirement): ReviewFormState {
  return {
    displayLabel: "",
    requirementText: req.requirement_text,
    referenceText: "",
    showReference: false,
    requiresEvidence: false,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ReviewSplitViewProps {
  requirement: ReviewRequirement;
  materialUrl?: string | null;
  onAction: (action: ReviewAction) => void;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
  /** Position label, e.g. "3 de 12" */
  positionLabel: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReviewSplitView({
  requirement,
  materialUrl,
  onAction,
  onNavigate,
  hasPrev,
  hasNext,
  positionLabel,
}: ReviewSplitViewProps) {
  const [form, setForm] = useState<ReviewFormState>(() =>
    buildInitialForm(requirement),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever requirement changes
  useEffect(() => {
    setForm(buildInitialForm(requirement));
    setError(null);
  }, [requirement.requirement_id]);

  const set = <K extends keyof ReviewFormState>(
    key: K,
    value: ReviewFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleApprove() {
    setError(null);
    setLoading(true);
    try {
      await updateRequirement(requirement.requirement_id, {
        needsReview: false,
      });
      onAction({ type: "approve", requirementId: requirement.requirement_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aprobar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEditApprove() {
    const trimmedText = form.requirementText.trim();
    if (!trimmedText) {
      setError("El texto del requisito es obligatorio.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await updateRequirement(requirement.requirement_id, {
        displayLabel: form.displayLabel.trim() || null,
        requirementText: trimmedText,
        referenceText: form.referenceText.trim() || null,
        requiresEvidence: form.requiresEvidence,
        needsReview: false,
      });
      onAction({
        type: "edit-approve",
        requirementId: requirement.requirement_id,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar y aprobar.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setError(null);
    setLoading(true);
    try {
      await deleteRequirement(requirement.requirement_id);
      onAction({ type: "reject", requirementId: requirement.requirement_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden rounded-xl border">
      {/* Top bar — navigation and position counter */}
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("prev")}
            disabled={!hasPrev || loading}
            aria-label="Requisito anterior"
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            {positionLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("next")}
            disabled={!hasNext || loading}
            aria-label="Siguiente requisito"
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning">Pendiente de revisión</Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {requirement.honors.name}
          </span>
        </div>
      </div>

      {/* Split body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: PDF embed ─────────────────────────────────── */}
        <div className="flex w-1/2 flex-col overflow-hidden border-r">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-medium">Material de referencia</span>
            {materialUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir material en nueva pestaña"
                >
                  <ExternalLink className="mr-1.5 size-4" />
                  Abrir en nueva pestaña
                </a>
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {materialUrl ? (
              <iframe
                src={materialUrl}
                title="Material de la especialidad"
                className="size-full border-0"
                allow="fullscreen"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  Sin material de referencia
                </p>
                <p className="max-w-xs text-[13px] text-muted-foreground">
                  Esta especialidad no tiene un PDF de material asociado. Podés
                  añadirlo desde la edición de la especialidad.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: editable form ────────────────────────────── */}
        <div className="flex w-1/2 flex-col overflow-y-auto">
          <div className="border-b px-4 py-2">
            <span className="text-sm font-medium">Requisito a revisar</span>
            <p className="text-[13px] text-muted-foreground">
              Editá los campos y elegí una acción.
            </p>
          </div>

          <div className="flex-1 space-y-5 px-4 py-4">
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            {/* Display label */}
            <div className="space-y-1.5">
              <Label htmlFor="rv-displayLabel" className="text-sm font-medium">
                Etiqueta de visualización{" "}
                <span className="text-muted-foreground">(máx. 10 caracteres)</span>
              </Label>
              <Input
                id="rv-displayLabel"
                value={form.displayLabel}
                onChange={(e) =>
                  set("displayLabel", e.target.value.slice(0, 10))
                }
                placeholder="Ej: 1, 1a, A.1"
                maxLength={10}
                disabled={loading}
              />
            </div>

            {/* Requirement text */}
            <div className="space-y-1.5">
              <Label
                htmlFor="rv-requirementText"
                className="text-sm font-medium"
              >
                Texto del requisito{" "}
                <span className="text-destructive/70">*</span>
              </Label>
              <Textarea
                id="rv-requirementText"
                value={form.requirementText}
                onChange={(e) => set("requirementText", e.target.value)}
                placeholder="Describe el requisito..."
                rows={5}
                className="min-h-[100px] resize-none"
                disabled={loading}
                required
              />
            </div>

            {/* Reference text — collapsible */}
            <div className="space-y-1.5">
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                onClick={() => set("showReference", !form.showReference)}
                disabled={loading}
              >
                {form.showReference
                  ? "Ocultar referencia bibliográfica"
                  : "Agregar referencia bibliográfica"}
              </button>
              {form.showReference && (
                <Textarea
                  id="rv-referenceText"
                  value={form.referenceText}
                  onChange={(e) => set("referenceText", e.target.value)}
                  placeholder="Ej: Libro de Especialidades, págs. 45-50"
                  rows={3}
                  className="min-h-[70px] resize-none"
                  disabled={loading}
                />
              )}
            </div>

            {/* Requires evidence toggle */}
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <div className="space-y-0.5">
                <Label
                  htmlFor="rv-requiresEvidence"
                  className="text-sm font-medium"
                >
                  Requiere evidencia
                </Label>
                <p className="text-[13px] text-muted-foreground">
                  El miembro debe adjuntar un archivo como comprobante.
                </p>
              </div>
              <Switch
                id="rv-requiresEvidence"
                checked={form.requiresEvidence}
                onCheckedChange={(v) => set("requiresEvidence", v)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Action buttons — sticky bottom */}
          <div className="sticky bottom-0 border-t bg-card px-4 py-3">
            <div className="flex flex-col gap-2">
              {/* Primary actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => void handleApprove()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => void handleEditApprove()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Editar y aprobar
                </Button>
              </div>
              {/* Destructive action */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => void handleReject()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
