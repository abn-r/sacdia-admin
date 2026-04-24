"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ClipboardEdit,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FolderStatusBadge } from "@/components/annual-folders/folder-status-badge";
import { EvaluateSectionDialog } from "@/components/annual-folders/evaluate-section-dialog";
import { SectionStatusBadge } from "@/components/annual-folders/section-evaluation-card";
import {
  getFolder,
  getFolderEvaluations,
  reopenSection,
} from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import type {
  AnnualFolder,
  FolderSectionWithEvidences,
  SectionEvaluation,
} from "@/lib/api/annual-folders";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Section row ──────────────────────────────────────────────────────────────

interface EvalSectionRowProps {
  section: FolderSectionWithEvidences;
  evaluation: SectionEvaluation | undefined;
  folderId: string;
  onEvaluate: (section: FolderSectionWithEvidences) => void;
  onReopen: (section: FolderSectionWithEvidences) => void;
}

function EvalSectionRow({
  section,
  evaluation,
  folderId: _folderId,
  onEvaluate,
  onReopen,
}: EvalSectionRowProps) {
  const maxPoints = section.max_points ?? 0;
  const isEvaluated = !!evaluation;
  const evalStatus = evaluation?.status;

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header row */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Section info */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {evalStatus === "VALIDATED" ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : section.required ? (
              <AlertCircle className="size-4 text-warning/80" />
            ) : (
              <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{section.name}</span>
              {section.required && (
                <Badge variant="outline" className="text-xs">
                  Requerida
                </Badge>
              )}
              {evalStatus ? (
                <SectionStatusBadge status={evalStatus} />
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Sin evaluar
                </Badge>
              )}
            </div>

            {section.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {section.description}
              </p>
            )}

            {/* Evidences count */}
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="size-3" />
              {section.evidences.length}{" "}
              {section.evidences.length === 1
                ? "evidencia subida"
                : "evidencias subidas"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {isEvaluated ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => onReopen(section)}
              className="text-warning hover:text-warning/80"
            >
              <RotateCcw className="size-3.5" />
              Reabrir
            </Button>
          ) : null}
          <Button size="xs" onClick={() => onEvaluate(section)}>
            <ClipboardEdit className="size-3.5" />
            {isEvaluated ? "Editar" : "Evaluar"}
          </Button>
        </div>
      </div>

      {/* Evaluation detail (when evaluated) */}
      {isEvaluated && (
        <div className="border-t border-border bg-muted/30 px-4 py-3">
          <div className="space-y-1.5">
            {/* Score */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {evaluation.earned_points}
                <span className="font-normal text-muted-foreground">
                  {" "}/ {maxPoints} pts
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                ({maxPoints > 0
                  ? Math.round((evaluation.earned_points / maxPoints) * 100)
                  : 0}
                %)
              </span>
            </div>

            {/* LF actor */}
            {evaluation.lf_approver && (
              <p className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">LF:</span>
                {evaluation.lf_approver.name}
                {evaluation.lf_approved_at
                  ? ` · ${formatDateTime(evaluation.lf_approved_at)}`
                  : ""}
              </p>
            )}

            {/* Union actor */}
            {evaluation.union_approver && (
              <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Unión:</span>
                {evaluation.union_approver.name}
                {evaluation.union_approved_at
                  ? ` · ${formatDateTime(evaluation.union_approved_at)}`
                  : ""}
                {evaluation.union_decision === "REJECTED_OVERRIDE" && (
                  <Badge variant="destructive" className="text-xs">
                    Rechazo por unión
                  </Badge>
                )}
              </p>
            )}

            {/* Notes */}
            {evaluation.notes && (
              <p className="mt-1 rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                {evaluation.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Folder summary card ──────────────────────────────────────────────────────

interface FolderSummaryCardProps {
  folder: AnnualFolder;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function FolderSummaryCard({
  folder,
  onRefresh,
  isRefreshing,
}: FolderSummaryCardProps) {
  const totalEarned = folder.total_earned_points ?? 0;
  const totalMax = folder.total_max_points ?? 0;
  const progressPct = folder.progress_percentage ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: folder info */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <FolderStatusBadge status={folder.status} />
            <span className="text-sm font-semibold">
              Carpeta #{folder.folder_id}
            </span>
          </div>

          <div className="grid gap-0.5 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">Inscripción:</span>{" "}
              #{folder.enrollment_id}
              {folder.enrollment?.club_name
                ? ` — ${folder.enrollment.club_name}`
                : ""}
            </span>
            <span>
              <span className="font-medium text-foreground">Plantilla:</span>{" "}
              {folder.template?.name ?? `#${folder.template_id}`}
            </span>
            {folder.submitted_at && (
              <span>
                <span className="font-medium text-foreground">Enviada:</span>{" "}
                {formatDate(folder.submitted_at)}
              </span>
            )}
            {folder.evaluated_at && (
              <span>
                <span className="font-medium text-foreground">
                  Última evaluación:
                </span>{" "}
                {formatDate(folder.evaluated_at)}
              </span>
            )}
          </div>
        </div>

        {/* Right: score summary */}
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <p className="text-2xl font-bold tabular-nums">
            {totalEarned}
            <span className="text-base font-normal text-muted-foreground">
              {" "}/ {totalMax}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">puntos obtenidos</p>
          <Button
            variant="outline"
            size="xs"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {totalMax > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Puntaje total</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EvaluationClientPage() {
  const t = useTranslations("annual_folders");
  const [folderInput, setFolderInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [folder, setFolder] = useState<AnnualFolder | null>(null);
  const [evaluations, setEvaluations] = useState<SectionEvaluation[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Evaluate dialog state
  const [evaluateOpen, setEvaluateOpen] = useState(false);
  const [evaluatingSection, setEvaluatingSection] =
    useState<FolderSectionWithEvidences | null>(null);

  // Reopen confirm state
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopeningSection, setReopeningSection] =
    useState<FolderSectionWithEvidences | null>(null);
  const [isReopening, setIsReopening] = useState(false);

  // ─── Load folder + evaluations ─────────────────────────────────────────────

  const loadFolder = useCallback(async (id: string) => {
    const [folderResult, evalsResult] = await Promise.allSettled([
      getFolder(id),
      getFolderEvaluations(id),
    ]);

    if (folderResult.status === "fulfilled") {
      setFolder(folderResult.value);
    } else {
      const err = folderResult.reason;
      throw err;
    }

    if (evalsResult.status === "fulfilled") {
      setEvaluations(evalsResult.value);
    } else {
      // Non-fatal: folder loaded but evaluations failed
      setEvaluations([]);
    }
  }, []);

  // ─── Search handler ────────────────────────────────────────────────────────

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = folderInput.trim();
    if (!id) {
      setSearchError("Ingresa el ID de la carpeta");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setFolder(null);
    setEvaluations([]);

    try {
      await loadFolder(id);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar la carpeta. Verificá el ID e intentá de nuevo.";
      setSearchError(message);
    } finally {
      setIsSearching(false);
    }
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  const refreshFolder = useCallback(async () => {
    if (!folder) return;
    setIsRefreshing(true);
    try {
      await loadFolder(folder.folder_id);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar la carpeta";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [folder, loadFolder]);

  // ─── Evaluate section ──────────────────────────────────────────────────────

  function handleEvaluate(section: FolderSectionWithEvidences) {
    setEvaluatingSection(section);
    setEvaluateOpen(true);
  }

  // ─── Reopen section ────────────────────────────────────────────────────────

  function handleReopen(section: FolderSectionWithEvidences) {
    setReopeningSection(section);
    setReopenOpen(true);
  }

  async function confirmReopen() {
    if (!folder || !reopeningSection) return;
    setIsReopening(true);
    try {
      await reopenSection(folder.folder_id, reopeningSection.section_id);
      toast.success(t("toasts.section_reopened"));
      setReopenOpen(false);
      setReopeningSection(null);
      await refreshFolder();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo reabrir la sección";
      toast.error(message);
    } finally {
      setIsReopening(false);
    }
  }

  // ─── Derived data ──────────────────────────────────────────────────────────

  const sortedSections = [...(folder?.sections ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  function getEvaluationForSection(
    section: FolderSectionWithEvidences,
  ): SectionEvaluation | undefined {
    return evaluations.find(
      (ev) => String(ev.section_id) === String(section.section_id),
    );
  }

  const currentEvaluation = evaluatingSection
    ? getEvaluationForSection(evaluatingSection)
    : undefined;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Buscar carpeta para evaluar</p>
        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label
              htmlFor="eval-folder-id"
              className="text-xs text-muted-foreground"
            >
              ID de carpeta (UUID)
            </Label>
            <Input
              id="eval-folder-id"
              type="text"
              placeholder="Ej. 3f2a1b4c-..."
              value={folderInput}
              onChange={(e) => {
                setFolderInput(e.target.value);
                if (searchError) setSearchError(null);
              }}
              className={`h-9 ${searchError ? "border-destructive" : ""}`}
            />
            {searchError && (
              <p className="text-xs text-destructive">{searchError}</p>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isSearching || !folderInput.trim()}
          >
            <Search className="size-4" />
            {isSearching ? "Buscando..." : "Buscar"}
          </Button>
        </form>
      </div>

      {/* Folder loaded */}
      {folder && (
        <>
          {/* Summary card */}
          <FolderSummaryCard
            folder={folder}
            onRefresh={refreshFolder}
            isRefreshing={isRefreshing}
          />

          {/* Actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Secciones ({sortedSections.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              asChild
              title="Ver carpeta completa con evidencias"
            >
              <a
                href={`/dashboard/annual-folders?folder=${folder.folder_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                Ver evidencias
              </a>
            </Button>
          </div>

          {/* Sections list */}
          {sortedSections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Esta carpeta no tiene secciones configuradas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSections.map((section) => (
                <EvalSectionRow
                  key={section.section_id}
                  section={section}
                  evaluation={getEvaluationForSection(section)}
                  folderId={folder.folder_id}
                  onEvaluate={handleEvaluate}
                  onReopen={handleReopen}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Evaluate section dialog */}
      {evaluatingSection && folder && (
        <EvaluateSectionDialog
          open={evaluateOpen}
          onOpenChange={setEvaluateOpen}
          folderId={folder.folder_id}
          sectionId={evaluatingSection.section_id}
          sectionName={evaluatingSection.name}
          maxPoints={evaluatingSection.max_points ?? 0}
          currentPoints={currentEvaluation?.earned_points ?? null}
          currentNotes={currentEvaluation?.notes ?? null}
          onSuccess={refreshFolder}
        />
      )}

      {/* Reopen section confirm dialog */}
      <AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir sección</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la evaluación de{" "}
              <strong>{reopeningSection?.name}</strong> y dejará la sección
              disponible para ser evaluada nuevamente. ¿Confirmás?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReopening}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReopen}
              disabled={isReopening}
              className="bg-warning text-white hover:bg-warning/90"
            >
              {isReopening ? "Reabriendo..." : "Reabrir sección"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
