"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Trash2,
  GripVertical,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { TemplateFormDialog } from "@/components/annual-folders/template-form-dialog";
import { SectionFormDialog } from "@/components/annual-folders/section-form-dialog";
import {
  getTemplate,
  deleteTemplateSection,
} from "@/lib/api/annual-folders";
import { ApiError, apiRequestFromClient } from "@/lib/api/client";
import type { FolderTemplate, FolderTemplateSection } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplatesClientPageProps {
  initialTemplates: FolderTemplate[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractTemplates(payload: unknown): FolderTemplate[] {
  if (Array.isArray(payload)) return payload as FolderTemplate[];
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data as FolderTemplate[];
  }
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplatesClientPage({
  initialTemplates,
  clubTypes,
  ecclesiasticalYears,
}: TemplatesClientPageProps) {
  const [templates, setTemplates] = useState<FolderTemplate[]>(initialTemplates);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Template CRUD state
  const [templateFormOpen, setTemplateFormOpen] = useState(false);

  // Detail view state
  const [activeTemplate, setActiveTemplate] = useState<FolderTemplate | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Section CRUD state
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FolderTemplateSection | null>(null);
  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false);
  const [deletingSection, setDeletingSection] = useState<FolderTemplateSection | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState(false);

  // ─── Refresh list ──────────────────────────────────────────────────────────

  const refreshTemplates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const payload = await apiRequestFromClient<unknown>("/annual-folders/templates");
      setTemplates(extractTemplates(payload));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron actualizar las plantillas";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ─── Open template detail ──────────────────────────────────────────────────

  const handleOpenTemplate = useCallback(async (template: FolderTemplate) => {
    setIsLoadingDetail(true);
    setActiveTemplate(template);
    try {
      const detail = await getTemplate(template.template_id);
      setActiveTemplate(detail);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar el detalle de la plantilla";
      toast.error(message);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // ─── Refresh active template detail ───────────────────────────────────────

  const refreshActiveTemplate = useCallback(async () => {
    if (!activeTemplate) return;
    try {
      const detail = await getTemplate(activeTemplate.template_id);
      setActiveTemplate(detail);
    } catch {
      // Non-fatal; user can go back and re-open
    }
  }, [activeTemplate]);

  // ─── Section add ──────────────────────────────────────────────────────────

  function handleAddSection() {
    setEditingSection(null);
    setSectionFormOpen(true);
  }

  // ─── Section edit ──────────────────────────────────────────────────────────

  function handleEditSection(section: FolderTemplateSection) {
    setEditingSection(section);
    setSectionFormOpen(true);
  }

  // ─── Section delete ────────────────────────────────────────────────────────

  function handleDeleteSection(section: FolderTemplateSection) {
    setDeletingSection(section);
    setDeleteSectionOpen(true);
  }

  async function confirmDeleteSection() {
    if (!deletingSection) return;
    setIsDeletingSection(true);
    try {
      await deleteTemplateSection(deletingSection.section_id);
      toast.success("Sección eliminada correctamente");
      setDeleteSectionOpen(false);
      setDeletingSection(null);
      await refreshActiveTemplate();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la sección";
      toast.error(message);
    } finally {
      setIsDeletingSection(false);
    }
  }

  // ─── Sections sorted by order ──────────────────────────────────────────────

  const sortedSections = [...(activeTemplate?.sections ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  const nextSectionOrder =
    sortedSections.length > 0
      ? Math.max(...sortedSections.map((s) => s.order)) + 1
      : 1;

  // ─── Render ────────────────────────────────────────────────────────────────

  // Detail view
  if (activeTemplate) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setActiveTemplate(null)}
              title="Volver a plantillas"
            >
              <ArrowLeft className="size-4" />
              <span className="sr-only">Volver</span>
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{activeTemplate.name}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{activeTemplate.club_type?.name ?? `Tipo ${activeTemplate.club_type_id}`}</span>
                <span aria-hidden>·</span>
                <span>{activeTemplate.ecclesiastical_year?.name ?? `Año ${activeTemplate.ecclesiastical_year_id}`}</span>
                <span aria-hidden>·</span>
                <span>{sortedSections.length} {sortedSections.length === 1 ? "sección" : "secciones"}</span>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={handleAddSection} disabled={isLoadingDetail}>
            <Plus className="size-4" />
            Agregar sección
          </Button>
        </div>

        {isLoadingDetail ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Cargando secciones...
          </div>
        ) : sortedSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <GripVertical className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold">Sin secciones</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Esta plantilla no tiene secciones todavía. Agrega la primera para
              definir qué evidencias deben subir los miembros.
            </p>
            <Button size="sm" className="mt-4" onClick={handleAddSection}>
              <Plus className="size-4" />
              Agregar sección
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Orden</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                  <TableHead className="w-28 text-center">Requerida</TableHead>
                  <TableHead className="w-20 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSections.map((section) => (
                  <TableRow key={section.section_id}>
                    <TableCell className="text-center">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {section.order}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell className="hidden max-w-xs truncate text-muted-foreground sm:table-cell">
                      {section.description ?? (
                        <span className="italic text-muted-foreground/60">Sin descripción</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {section.required ? (
                        <CheckCircle2 className="mx-auto size-4 text-green-600" />
                      ) : (
                        <Circle className="mx-auto size-4 text-muted-foreground/40" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleEditSection(section)}
                          title="Editar sección"
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDeleteSection(section)}
                          title="Eliminar sección"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Section dialogs */}
        <SectionFormDialog
          open={sectionFormOpen}
          onOpenChange={setSectionFormOpen}
          templateId={activeTemplate.template_id}
          section={editingSection}
          nextOrder={nextSectionOrder}
          onSuccess={refreshActiveTemplate}
        />

        <AlertDialog open={deleteSectionOpen} onOpenChange={setDeleteSectionOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar sección</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente la sección{" "}
                <strong>{deletingSection?.name}</strong>. Los datos de evidencias
                asociados también serán eliminados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingSection}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteSection}
                disabled={isDeletingSection}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeletingSection ? "Eliminando..." : "Eliminar sección"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── Templates list view ───────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{templates.length}</span>{" "}
            {templates.length === 1 ? "plantilla" : "plantillas"}
          </p>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshTemplates}
            disabled={isRefreshing}
            title="Actualizar"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="sr-only">Actualizar</span>
          </Button>
        </div>
        <Button size="sm" onClick={() => setTemplateFormOpen(true)}>
          <Plus className="size-4" />
          Nueva plantilla
        </Button>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Plus className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">Sin plantillas</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Crea la primera plantilla para definir la estructura de carpetas
            anuales por tipo de club y año eclesiástico.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setTemplateFormOpen(true)}>
            <Plus className="size-4" />
            Nueva plantilla
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo de club</TableHead>
                <TableHead>Año eclesiástico</TableHead>
                <TableHead className="w-24 text-center">Secciones</TableHead>
                <TableHead className="w-16 text-center">Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.template_id}
                  className="cursor-pointer"
                  onClick={() => handleOpenTemplate(template)}
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {template.club_type?.name ?? `Tipo ${template.club_type_id}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {template.ecclesiastical_year?.name ?? `Año ${template.ecclesiastical_year_id}`}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">
                      {template.sections?.length ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={template.active ? "success" : "secondary"}
                      className="text-xs"
                    >
                      {template.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create template dialog */}
      <TemplateFormDialog
        open={templateFormOpen}
        onOpenChange={setTemplateFormOpen}
        clubTypes={clubTypes}
        ecclesiasticalYears={ecclesiasticalYears}
        onSuccess={refreshTemplates}
      />
    </div>
  );
}
