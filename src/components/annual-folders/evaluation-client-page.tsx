"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ClipboardEdit,
  XCircle,
  Eye,
  FileText,
  FolderSearch,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AnnualFolderEvidenceViewerDialog } from "@/components/annual-folders/annual-folder-evidence-viewer-dialog";
import { SectionStatusBadge } from "@/components/annual-folders/section-evaluation-card";
import {
  confirmUnionSection,
  getEvaluationQueue,
  getFolder,
  getFolderEvaluations,
  reopenSection,
} from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import type {
  AnnualFolder,
  AnnualFolderEvaluationQueueItem,
  AnnualFolderEvaluationQueueStatus,
  FolderEvidence,
  FolderSectionWithEvidences,
  SectionEvaluation,
  UnionConfirmationDecision,
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

function formatEvidenceDate(evidence: FolderEvidence): string {
  return formatDateTime(evidence.uploaded_at ?? evidence.created_at);
}

function folderClubName(folder: AnnualFolder): string {
  return folder.club_enrollment?.club_section?.club?.name ?? "Club sin nombre";
}

function folderSectionName(folder: AnnualFolder): string {
  return (
    folder.club_enrollment?.club_section?.name ??
    folder.club_enrollment?.club_section?.club_type?.name ??
    "Sección sin nombre"
  );
}

function folderYearLabel(folder: AnnualFolder): string {
  return folder.club_enrollment?.ecclesiastical_year?.label ?? "Año eclesiástico";
}

// ─── Section row ──────────────────────────────────────────────────────────────

interface EvalSectionRowProps {
  section: FolderSectionWithEvidences;
  evaluation: SectionEvaluation | undefined;
  folderRequiresUnionConfirmation: boolean;
  canConfirmUnion: boolean;
  onEvaluate: (section: FolderSectionWithEvidences) => void;
  onReopen: (section: FolderSectionWithEvidences) => void;
  onConfirmUnion: (section: FolderSectionWithEvidences) => void;
  onPreviewEvidence: (
    evidence: FolderEvidence,
    evidences: FolderEvidence[],
  ) => void;
}

function EvalSectionRow({
  section,
  evaluation,
  folderRequiresUnionConfirmation,
  canConfirmUnion,
  onEvaluate,
  onReopen,
  onConfirmUnion,
  onPreviewEvidence,
}: EvalSectionRowProps) {
  const maxPoints = section.max_points ?? 0;
  const evalStatus = evaluation?.status;
  const canEvaluate = evalStatus === "SUBMITTED";
  const awaitsUnion =
    folderRequiresUnionConfirmation && evalStatus === "PREAPPROVED_LF";
  const canReopen =
    evalStatus === "PREAPPROVED_LF" ||
    evalStatus === "VALIDATED" ||
    evalStatus === "REJECTED";
  const showEvaluationDetail =
    evalStatus === "PREAPPROVED_LF" ||
    evalStatus === "VALIDATED" ||
    evalStatus === "REJECTED";

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
          {canReopen ? (
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
          {canEvaluate ? (
            <Button size="xs" onClick={() => onEvaluate(section)}>
              <ClipboardEdit className="size-3.5" />
              Evaluar
            </Button>
          ) : awaitsUnion && canConfirmUnion ? (
            <Button size="xs" onClick={() => onConfirmUnion(section)}>
              <CheckCircle2 className="size-3.5" />
              Confirmar Unión
            </Button>
          ) : (
            <Button size="xs" variant="outline" disabled>
              {evalStatus === "PENDING"
                ? "Pendiente de envío"
                : awaitsUnion
                  ? "Pendiente de Unión"
                  : "No evaluable"}
            </Button>
          )}
        </div>
      </div>

      {section.evidences.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="space-y-2">
            {section.evidences.map((evidence) => (
              <div
                key={evidence.evidence_id}
                className="grid min-w-0 gap-2 rounded-md bg-muted/40 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium">
                    {evidence.file_name ?? "Evidencia sin nombre"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {evidence.uploaded_by ?? "Usuario no disponible"} ·{" "}
                    {formatEvidenceDate(evidence)}
                  </p>
                  {evidence.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {evidence.notes}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => onPreviewEvidence(evidence, section.evidences)}
                >
                  <Eye className="size-3.5" />
                  Ver
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation detail (when evaluated) */}
      {showEvaluationDetail && evaluation && (
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
  const club = folder.club_enrollment?.club_section?.club;
  const localField = club?.local_field;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: folder info */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <FolderStatusBadge status={folder.status} />
            <span className="text-sm font-semibold">
              {folderClubName(folder)} · {folderSectionName(folder)} ·{" "}
              {folderYearLabel(folder)}
            </span>
          </div>

          <div className="grid gap-0.5 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">Campo:</span>{" "}
              {localField?.name ?? "—"}
              {localField?.union?.name ? ` · ${localField.union.name}` : ""}
            </span>
            <span>
              <span className="font-medium text-foreground">Plantilla:</span>{" "}
              {folder.template?.name ?? `#${folder.folder_template_id}`}
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

// ─── Evaluation queue ─────────────────────────────────────────────────────────

interface QueueCardProps {
  item: AnnualFolderEvaluationQueueItem;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: (item: AnnualFolderEvaluationQueueItem) => void;
}

function QueueCard({ item, isSelected, isLoading, onSelect }: QueueCardProps) {
  const pendingCount =
    item.submitted_sections_count + item.preapproved_sections_count;

  return (
    <div
      className={`rounded-lg border bg-card p-4 transition-colors ${
        isSelected ? "border-primary/70 ring-1 ring-primary/40" : "border-border"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {item.club_name}
            </h3>
            <Badge variant="outline">{item.club_section_name}</Badge>
            <Badge variant="secondary">{item.year_label}</Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            {item.template_name}
            {item.local_field_name ? ` · ${item.local_field_name}` : ""}
            {item.union_name ? ` · ${item.union_name}` : ""}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{pendingCount} secciones pendientes</span>
            <span>·</span>
            <span>{item.total_evidences} evidencias</span>
            {item.latest_submitted_at && (
              <>
                <span>·</span>
                <span>Último envío: {formatDate(item.latest_submitted_at)}</span>
              </>
            )}
          </div>

          {item.pending_section_names.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.pending_section_names.map((name) => (
                <Badge key={name} variant="outline" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => onSelect(item)}
          disabled={isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ClipboardEdit className="size-4" />
          )}
          Revisar carpeta
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EvaluationClientPageProps {
  currentUserRoles?: string[];
}

const UNION_CONFIRMATION_ROLES = new Set(["director-union", "assistant-union"]);

export function EvaluationClientPage({
  currentUserRoles = [],
}: EvaluationClientPageProps) {
  const t = useTranslations("annual_folders");
  const canConfirmUnion = currentUserRoles.some((role) =>
    UNION_CONFIRMATION_ROLES.has(role),
  );
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [queueStatus, setQueueStatus] =
    useState<AnnualFolderEvaluationQueueStatus>("needs_review");
  const [queueItems, setQueueItems] = useState<AnnualFolderEvaluationQueueItem[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [selectedQueueItem, setSelectedQueueItem] =
    useState<AnnualFolderEvaluationQueueItem | null>(null);
  const [isFolderLoading, setIsFolderLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [folder, setFolder] = useState<AnnualFolder | null>(null);
  const [evaluations, setEvaluations] = useState<SectionEvaluation[]>([]);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Evaluate dialog state
  const [evaluateOpen, setEvaluateOpen] = useState(false);
  const [evaluatingSection, setEvaluatingSection] =
    useState<FolderSectionWithEvidences | null>(null);

  // Reopen confirm state
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopeningSection, setReopeningSection] =
    useState<FolderSectionWithEvidences | null>(null);
  const [isReopening, setIsReopening] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState<FolderEvidence | null>(
    null,
  );
  const [previewEvidences, setPreviewEvidences] = useState<FolderEvidence[]>([]);

  // Union confirmation state
  const [unionConfirmOpen, setUnionConfirmOpen] = useState(false);
  const [unionConfirmingSection, setUnionConfirmingSection] =
    useState<FolderSectionWithEvidences | null>(null);
  const [unionNotes, setUnionNotes] = useState("");
  const [isConfirmingUnion, setIsConfirmingUnion] = useState(false);

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

  const loadQueue = useCallback(
    async (
      search: string,
      status: AnnualFolderEvaluationQueueStatus,
    ) => {
      setIsQueueLoading(true);
      setQueueError(null);
      try {
        const result = await getEvaluationQueue({
          search: search || undefined,
          status,
          page: 1,
          limit: 50,
        });
        setQueueItems(result.data);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar la lista de carpetas para evaluar";
        setQueueError(message);
        setQueueItems([]);
      } finally {
        setIsQueueLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadQueue(appliedSearch, queueStatus);
  }, [appliedSearch, queueStatus, loadQueue]);

  // ─── Search handler ────────────────────────────────────────────────────────

  function handleQueueSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  }

  async function handleSelectFolder(item: AnnualFolderEvaluationQueueItem) {
    setSelectedQueueItem(item);
    setIsFolderLoading(true);
    setFolderError(null);
    setFolder(null);
    setEvaluations([]);

    try {
      await loadFolder(item.annual_folder_id);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar la carpeta seleccionada.";
      setFolderError(message);
    } finally {
      setIsFolderLoading(false);
    }
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  const refreshFolder = useCallback(async () => {
    if (!folder) return;
    setIsRefreshing(true);
    try {
      await loadFolder(folder.annual_folder_id);
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

  function handlePreviewEvidence(
    evidence: FolderEvidence,
    evidences: FolderEvidence[],
  ) {
    setPreviewEvidences(evidences);
    setPreviewEvidence(evidence);
  }

  function handlePreviewOpenChange(open: boolean) {
    if (!open) {
      setPreviewEvidence(null);
      setPreviewEvidences([]);
    }
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
      await reopenSection(folder.annual_folder_id, reopeningSection.section_id);
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

  // ─── Union confirmation ───────────────────────────────────────────────────

  function handleConfirmUnion(section: FolderSectionWithEvidences) {
    setUnionConfirmingSection(section);
    setUnionNotes("");
    setUnionConfirmOpen(true);
  }

  async function submitUnionDecision(decision: UnionConfirmationDecision) {
    if (!folder || !unionConfirmingSection) return;
    setIsConfirmingUnion(true);
    try {
      await confirmUnionSection(
        folder.annual_folder_id,
        unionConfirmingSection.section_id,
        {
          decision,
          notes: unionNotes.trim() || undefined,
        },
      );
      toast.success(
        decision === "APPROVED"
          ? "Sección confirmada por Unión"
          : "Sección rechazada por Unión",
      );
      setUnionConfirmOpen(false);
      setUnionConfirmingSection(null);
      setUnionNotes("");
      await refreshFolder();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo registrar la decisión de Unión";
      toast.error(message);
    } finally {
      setIsConfirmingUnion(false);
    }
  }

  // ─── Derived data ──────────────────────────────────────────────────────────

  const sortedSections = [...(folder?.sections ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  function getEvaluationForSection(
    section: FolderSectionWithEvidences,
  ): SectionEvaluation | undefined {
    const apiEvaluation = evaluations.find(
      (ev) => String(ev.section_id) === String(section.section_id),
    );

    if (!section.evaluation) {
      return apiEvaluation?.status ? apiEvaluation : undefined;
    }

    return {
      evaluation_id: section.evaluation.evaluation_id,
      section_id: section.section_id,
      section_name: section.name,
      section_order: section.order,
      earned_points: section.evaluation.earned_points,
      max_points: section.evaluation.max_points,
      notes: section.evaluation.notes,
      evaluator: apiEvaluation?.evaluator ?? null,
      evaluated_at: apiEvaluation?.evaluated_at ?? "",
      status: section.evaluation.status,
      lf_approver: apiEvaluation?.lf_approver ?? null,
      lf_approved_at: apiEvaluation?.lf_approved_at ?? null,
      union_approver: apiEvaluation?.union_approver ?? null,
      union_approved_at: apiEvaluation?.union_approved_at ?? null,
      union_decision: apiEvaluation?.union_decision ?? null,
    };
  }

  const currentEvaluation = evaluatingSection
    ? getEvaluationForSection(evaluatingSection)
    : undefined;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Human-readable queue */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium">Carpetas listas para revisar</p>
            <p className="text-xs text-muted-foreground">
              Buscá por nombre de club, sección, campo, unión o plantilla. El
              ID interno no hace falta para operar.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {queueItems.length} resultados visibles
          </Badge>
        </div>

        <form
          onSubmit={handleQueueSearch}
          className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_auto]"
        >
          <div className="space-y-1.5">
            <Label htmlFor="folder-search" className="text-xs text-muted-foreground">
              Buscar carpeta
            </Label>
            <Input
              id="folder-search"
              type="search"
              placeholder="Ej. Club Betel, Conquistadores, ACV..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select
              value={queueStatus}
              onValueChange={(value) =>
                setQueueStatus(value as AnnualFolderEvaluationQueueStatus)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needs_review">Pendientes</SelectItem>
                <SelectItem value="submitted">Enviadas por club</SelectItem>
                <SelectItem value="preapproved">Preaprobadas LF</SelectItem>
                <SelectItem value="evaluated">Evaluadas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" size="sm" className="self-end">
            <Search className="size-4" />
            Buscar
          </Button>
        </form>

        {queueError && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {queueError}
          </p>
        )}

        {folderError && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {folderError}
          </p>
        )}

        {isQueueLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando carpetas...
          </div>
        ) : queueItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <FolderSearch className="mb-2 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No hay carpetas para mostrar</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Probá cambiar el filtro de estado o buscar por otro nombre de
              club, sección, campo o plantilla.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {queueItems.map((item) => (
              <QueueCard
                key={item.annual_folder_id}
                item={item}
                isSelected={
                  selectedQueueItem?.annual_folder_id === item.annual_folder_id
                }
                isLoading={
                  isFolderLoading &&
                  selectedQueueItem?.annual_folder_id === item.annual_folder_id
                }
                onSelect={handleSelectFolder}
              />
            ))}
          </div>
        )}
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
                href={`/dashboard/annual-folders?folder=${folder.annual_folder_id}`}
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
                  folderRequiresUnionConfirmation={
                    folder.requires_union_confirmation
                  }
                  canConfirmUnion={canConfirmUnion}
                  onEvaluate={handleEvaluate}
                  onReopen={handleReopen}
                  onConfirmUnion={handleConfirmUnion}
                  onPreviewEvidence={handlePreviewEvidence}
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
          folderId={folder.annual_folder_id}
          sectionId={evaluatingSection.section_id}
          sectionName={evaluatingSection.name}
          maxPoints={evaluatingSection.max_points ?? 0}
          evidences={evaluatingSection.evidences}
          onPreviewEvidence={handlePreviewEvidence}
          currentPoints={currentEvaluation?.earned_points ?? null}
          currentNotes={currentEvaluation?.notes ?? null}
          onSuccess={refreshFolder}
        />
      )}

      <AnnualFolderEvidenceViewerDialog
        key={previewEvidence?.evidence_id ?? "closed"}
        evidence={previewEvidence}
        evidences={previewEvidences}
        onSelectEvidence={setPreviewEvidence}
        onOpenChange={handlePreviewOpenChange}
      />

      {/* Union confirmation dialog */}
      <Dialog open={unionConfirmOpen} onOpenChange={setUnionConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar revisión de Unión</DialogTitle>
            <DialogDescription>
              Registrá la decisión final para{" "}
              <strong>{unionConfirmingSection?.name}</strong>. Aprobar valida la
              sección; rechazar la marca como rechazada y no suma puntos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="union-notes">Observaciones</Label>
            <Textarea
              id="union-notes"
              value={unionNotes}
              onChange={(event) => setUnionNotes(event.target.value)}
              placeholder="Comentario opcional para auditoría..."
              maxLength={500}
              disabled={isConfirmingUnion}
            />
            <p className="text-right text-xs text-muted-foreground">
              {unionNotes.length}/500
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnionConfirmOpen(false)}
              disabled={isConfirmingUnion}
            >
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => void submitUnionDecision("REJECTED_OVERRIDE")}
                disabled={isConfirmingUnion}
              >
                <XCircle className="size-4" />
                Rechazar
              </Button>
              <Button
                type="button"
                onClick={() => void submitUnionDecision("APPROVED")}
                disabled={isConfirmingUnion}
              >
                <CheckCircle2 className="size-4" />
                Aprobar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
