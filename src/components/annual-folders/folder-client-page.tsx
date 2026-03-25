"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  Trash2,
  ExternalLink,
  RefreshCw,
  Send,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { EvidenceUploadDialog } from "@/components/annual-folders/evidence-upload-dialog";
import {
  getFolder,
  deleteEvidence,
  submitFolder,
  closeFolder,
} from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import type {
  AnnualFolder,
  FolderEvidence,
  FolderSectionWithEvidences,
} from "@/lib/api/annual-folders";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FolderClientPageProps {
  initialFolder: AnnualFolder;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Section row ──────────────────────────────────────────────────────────────

interface SectionRowProps {
  section: FolderSectionWithEvidences;
  folderStatus: AnnualFolder["status"];
  onUpload: (section: FolderSectionWithEvidences) => void;
  onDeleteEvidence: (evidence: FolderEvidence) => void;
}

function SectionRow({
  section,
  folderStatus,
  onUpload,
  onDeleteEvidence,
}: SectionRowProps) {
  const hasEvidences = section.evidences.length > 0;
  const isEditable = folderStatus === "open";

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {hasEvidences ? (
              <CheckCircle2 className="size-4 text-green-600" />
            ) : section.required ? (
              <AlertCircle className="size-4 text-amber-500" />
            ) : (
              <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{section.name}</span>
              {section.required && (
                <Badge variant="outline" className="text-xs">
                  Requerida
                </Badge>
              )}
            </div>
            {section.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {section.description}
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {section.evidences.length}{" "}
              {section.evidences.length === 1
                ? "evidencia subida"
                : "evidencias subidas"}
            </p>
          </div>
        </div>

        {isEditable && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => onUpload(section)}
          >
            <Upload className="size-3.5" />
            Subir
          </Button>
        )}
      </div>

      {/* Evidences list */}
      {section.evidences.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {section.evidences.map((evidence) => (
            <div
              key={evidence.evidence_id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {evidence.file_name ?? "Archivo sin nombre"}
                  </p>
                  {evidence.description && (
                    <p className="truncate text-xs text-muted-foreground">
                      {evidence.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Subido el {formatDate(evidence.uploaded_at)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  asChild
                  title="Ver archivo"
                >
                  <a
                    href={evidence.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-3.5" />
                    <span className="sr-only">Ver archivo</span>
                  </a>
                </Button>
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDeleteEvidence(evidence)}
                    title="Eliminar evidencia"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FolderClientPage({ initialFolder }: FolderClientPageProps) {
  const [folder, setFolder] = useState<AnnualFolder>(initialFolder);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSection, setUploadSection] =
    useState<FolderSectionWithEvidences | null>(null);

  // Delete evidence state
  const [deleteEvidenceOpen, setDeleteEvidenceOpen] = useState(false);
  const [deletingEvidence, setDeletingEvidence] =
    useState<FolderEvidence | null>(null);
  const [isDeletingEvidence, setIsDeletingEvidence] = useState(false);

  // Submit / close state
  const [submitOpen, setSubmitOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  // ─── Refresh folder ──────────────────────────────────────────────────────

  const refreshFolder = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const updated = await getFolder(folder.folder_id);
      setFolder(updated);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar la carpeta";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [folder.folder_id]);

  // ─── Upload handlers ─────────────────────────────────────────────────────

  function handleOpenUpload(section: FolderSectionWithEvidences) {
    setUploadSection(section);
    setUploadOpen(true);
  }

  // ─── Delete evidence handlers ────────────────────────────────────────────

  function handleDeleteEvidence(evidence: FolderEvidence) {
    setDeletingEvidence(evidence);
    setDeleteEvidenceOpen(true);
  }

  async function confirmDeleteEvidence() {
    if (!deletingEvidence) return;
    setIsDeletingEvidence(true);
    try {
      await deleteEvidence(deletingEvidence.evidence_id);
      toast.success("Evidencia eliminada correctamente");
      setDeleteEvidenceOpen(false);
      setDeletingEvidence(null);
      await refreshFolder();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la evidencia";
      toast.error(message);
    } finally {
      setIsDeletingEvidence(false);
    }
  }

  // ─── Submit folder ───────────────────────────────────────────────────────

  async function confirmSubmit() {
    setIsActioning(true);
    try {
      const updated = await submitFolder(folder.folder_id);
      setFolder(updated);
      toast.success("Carpeta enviada para revisión");
      setSubmitOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo enviar la carpeta";
      toast.error(message);
    } finally {
      setIsActioning(false);
    }
  }

  // ─── Close folder ─────────────────────────────────────────────────────────

  async function confirmClose() {
    setIsActioning(true);
    try {
      const updated = await closeFolder(folder.folder_id);
      setFolder(updated);
      toast.success("Carpeta cerrada correctamente");
      setCloseOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo cerrar la carpeta";
      toast.error(message);
    } finally {
      setIsActioning(false);
    }
  }

  // ─── Progress calculation ─────────────────────────────────────────────────

  const sortedSections = [...(folder.sections ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const requiredSections = sortedSections.filter((s) => s.required);
  const completedRequired = requiredSections.filter(
    (s) => s.evidences.length > 0,
  );
  const allRequiredDone =
    requiredSections.length > 0 &&
    completedRequired.length === requiredSections.length;

  const progressPct =
    requiredSections.length > 0
      ? Math.round((completedRequired.length / requiredSections.length) * 100)
      : 100;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Folder status card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Estado de la carpeta</span>
              <FolderStatusBadge status={folder.status} />
            </div>
            {folder.submitted_at && (
              <p className="text-xs text-muted-foreground">
                Enviada el {formatDate(folder.submitted_at)}
              </p>
            )}
            {folder.closed_at && (
              <p className="text-xs text-muted-foreground">
                Cerrada el {formatDate(folder.closed_at)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshFolder}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>

            {folder.status === "open" && (
              <Button
                size="sm"
                onClick={() => setSubmitOpen(true)}
                disabled={!allRequiredDone}
                title={
                  !allRequiredDone
                    ? "Completa todas las secciones requeridas primero"
                    : undefined
                }
              >
                <Send className="size-4" />
                Enviar carpeta
              </Button>
            )}

            {folder.status === "submitted" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCloseOpen(true)}
              >
                <Lock className="size-4" />
                Cerrar carpeta
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {requiredSections.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progreso requerido</span>
              <span className="font-medium">
                {completedRequired.length} / {requiredSections.length} secciones
              </span>
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

      {/* Sections */}
      {sortedSections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Esta carpeta no tiene secciones configuradas todavía.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Secciones ({sortedSections.length})
          </h2>
          {sortedSections.map((section) => (
            <SectionRow
              key={section.section_id}
              section={section}
              folderStatus={folder.status}
              onUpload={handleOpenUpload}
              onDeleteEvidence={handleDeleteEvidence}
            />
          ))}
        </div>
      )}

      {/* Upload dialog */}
      {uploadSection && (
        <EvidenceUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          folderId={folder.folder_id}
          sectionId={uploadSection.section_id}
          sectionName={uploadSection.name}
          onSuccess={refreshFolder}
        />
      )}

      {/* Delete evidence dialog */}
      <AlertDialog open={deleteEvidenceOpen} onOpenChange={setDeleteEvidenceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evidencia</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el archivo{" "}
              <strong>{deletingEvidence?.file_name ?? "seleccionado"}</strong>.
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingEvidence}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEvidence}
              disabled={isDeletingEvidence}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeletingEvidence ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit folder dialog */}
      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar carpeta</AlertDialogTitle>
            <AlertDialogDescription>
              Una vez enviada, no podrás modificar ni agregar evidencias hasta
              que sea revisada. Asegurate de haber subido todo lo requerido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSubmit}
              disabled={isActioning}
            >
              {isActioning ? "Enviando..." : "Enviar carpeta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close folder dialog */}
      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar carpeta</AlertDialogTitle>
            <AlertDialogDescription>
              Al cerrar la carpeta se registrará como finalizada. Esta acción es
              definitiva y no puede revertirse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClose}
              disabled={isActioning}
            >
              {isActioning ? "Cerrando..." : "Cerrar carpeta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
