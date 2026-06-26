"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  CalendarClock,
  Search,
  Building2,
  MapPin,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { SectionFormDialogProps } from "@/components/annual-folders/section-form-dialog";
import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";

const SectionFormDialog = dynamic<SectionFormDialogProps>(
  () =>
    import("@/components/annual-folders/section-form-dialog").then((m) => ({
      default: m.SectionFormDialog,
    })),
  { ssr: false, loading: () => null },
);
import {
  getTemplate,
  listTemplates,
  deleteTemplateSection,
  updateTemplate,
  copyTemplate as copyTemplateApi,
  deleteTemplate,
} from "@/lib/api/annual-folders";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";
import { ApiError } from "@/lib/api/client";
import type {
  FolderTemplate,
  FolderTemplateSection,
} from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";
import {
  folderTemplateSectionPointsTotal,
  resolveAnnualFolderMaxPointsForTemplateScope,
} from "@/lib/annual-folders/ranking-budget";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplatesClientPageProps {
  initialTemplates: FolderTemplate[];
  rankingConfigs: AnnualRankingConfig[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  unions: Union[];
  localFields: LocalField[];
  territoryScope: AdminTerritoryScope;
}

type OwnerTierFilter = "all" | "union" | "local_field";
type TemplateStatusFilter = "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveOwnerLabel(template: FolderTemplate): string {
  if (
    template.owner_union_id !== null &&
    template.owner_union_id !== undefined
  ) {
    return template.owner_union?.name ?? `Unión ${template.owner_union_id}`;
  }
  if (
    template.owner_local_field_id !== null &&
    template.owner_local_field_id !== undefined
  ) {
    return (
      template.owner_local_field?.name ??
      `Campo ${template.owner_local_field_id}`
    );
  }
  return "—";
}

function resolveTemplateStatus(
  template: FolderTemplate,
): Exclude<FolderTemplate["status"], undefined> {
  return template.status ?? (template.active ? "PUBLISHED" : "DRAFT");
}

function isDraftTemplate(template: FolderTemplate): boolean {
  return resolveTemplateStatus(template) === "DRAFT";
}

function templateStatusLabel(template: FolderTemplate): string {
  switch (resolveTemplateStatus(template)) {
    case "PUBLISHED":
      return "Publicada";
    case "ARCHIVED":
      return "Archivada";
    case "DRAFT":
    default:
      return "Borrador";
  }
}

function templateStatusVariant(template: FolderTemplate) {
  switch (resolveTemplateStatus(template)) {
    case "PUBLISHED":
      return "success" as const;
    case "ARCHIVED":
      return "outline" as const;
    case "DRAFT":
    default:
      return "secondary" as const;
  }
}

function findNextEcclesiasticalYear(
  template: FolderTemplate,
  ecclesiasticalYears: EcclesiasticalYear[],
) {
  const sorted = [...ecclesiasticalYears].sort((a, b) =>
    a.start_date.localeCompare(b.start_date),
  );
  const currentIndex = sorted.findIndex(
    (year) => year.ecclesiastical_year_id === template.ecclesiastical_year_id,
  );
  return currentIndex >= 0 ? sorted[currentIndex + 1] : undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplatesClientPage({
  initialTemplates,
  rankingConfigs,
  clubTypes,
  ecclesiasticalYears,
  unions,
  localFields,
  territoryScope,
}: TemplatesClientPageProps) {
  const t = useTranslations("annual_folders");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const latestParamsRef = useRef(searchParams.toString());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [templates, setTemplates] =
    useState<FolderTemplate[]>(initialTemplates);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Template CRUD state
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FolderTemplate | null>(
    null,
  );
  const [publishingTemplateId, setPublishingTemplateId] = useState<string | null>(
    null,
  );
  const [copyingTemplate, setCopyingTemplate] = useState<FolderTemplate | null>(
    null,
  );
  const [isCopyingTemplate, setIsCopyingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] =
    useState<FolderTemplate | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  // Detail view state
  const [activeTemplate, setActiveTemplate] = useState<FolderTemplate | null>(
    null,
  );
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Section CRUD state
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] =
    useState<FolderTemplateSection | null>(null);
  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false);
  const [deletingSection, setDeletingSection] =
    useState<FolderTemplateSection | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState(false);

  // ─── Filter state (URL-driven) ─────────────────────────────────────────────

  const currentOwnerTierFilter = (searchParams.get("owner_tier") ??
    "all") as OwnerTierFilter;
  const currentOwnerIdFilter = searchParams.get("owner_id") ?? "";
  const currentStatusFilter = (searchParams.get("status") ??
    "all") as TemplateStatusFilter;
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(latestParamsRef.current);
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      const next = qs ? `${pathname}?${qs}` : pathname;
      latestParamsRef.current = params.toString();
      router.replace(next);
    },
    [pathname, router],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam("search", value);
      }, 400);
    },
    [updateParam],
  );

  // ─── Filtered templates ────────────────────────────────────────────────────

  const filteredTemplates = templates.filter((tmpl) => {
    const searchTerm = searchParams.get("search") ?? "";
    if (
      searchTerm &&
      !tmpl.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    if (currentOwnerTierFilter === "union") {
      if (tmpl.owner_union_id === null || tmpl.owner_union_id === undefined)
        return false;
    } else if (currentOwnerTierFilter === "local_field") {
      if (
        tmpl.owner_local_field_id === null ||
        tmpl.owner_local_field_id === undefined
      )
        return false;
    }

    if (currentOwnerIdFilter) {
      const filterId = Number(currentOwnerIdFilter);
      if (currentOwnerTierFilter === "union") {
        if (tmpl.owner_union_id !== filterId) return false;
      } else if (currentOwnerTierFilter === "local_field") {
        if (tmpl.owner_local_field_id !== filterId) return false;
      }
    }

    if (
      currentStatusFilter !== "all" &&
      resolveTemplateStatus(tmpl) !== currentStatusFilter
    ) {
      return false;
    }

    return true;
  });

  const hasActiveFilters =
    Boolean(searchParams.get("search")) ||
    currentOwnerTierFilter !== "all" ||
    currentStatusFilter !== "all" ||
    Boolean(currentOwnerIdFilter);

  // ─── Refresh list ──────────────────────────────────────────────────────────

  const refreshTemplates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const payload = await listTemplates();
      setTemplates(payload);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("templates.errorRefresh");
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [t]);

  // ─── Open template detail ──────────────────────────────────────────────────

  const handleOpenTemplate = useCallback(
    async (template: FolderTemplate) => {
      setIsLoadingDetail(true);
      setActiveTemplate(template);
      try {
        const detail = await getTemplate(template.template_id);
        setActiveTemplate(detail);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : t("templates.errorLoadSections");
        toast.error(message);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [t],
  );

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

  // ─── Template edit ─────────────────────────────────────────────────────────

  function handleEditTemplate(template: FolderTemplate, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!isDraftTemplate(template)) {
      toast.error("Esta plantilla ya está publicada. Copiala para crear un nuevo borrador.");
      return;
    }
    setEditingTemplate(template);
    setTemplateFormOpen(true);
  }

  function handleTemplateFormClose(open: boolean) {
    setTemplateFormOpen(open);
    if (!open) setEditingTemplate(null);
  }

  const handleTemplateSaved = useCallback(async () => {
    await refreshTemplates();
    await refreshActiveTemplate();
  }, [refreshActiveTemplate, refreshTemplates]);

  async function handlePublishTemplate(template: FolderTemplate, e?: React.MouseEvent) {
    e?.stopPropagation();
    setPublishingTemplateId(template.template_id);
    try {
      const updated = await updateTemplate(template.template_id, { active: true });
      toast.success("Plantilla publicada. Ya puede generar carpetas.");
      setTemplates((current) =>
        current.map((item) =>
          item.template_id === updated.template_id ? updated : item,
        ),
      );
      setActiveTemplate((current) =>
        current?.template_id === updated.template_id ? updated : current,
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo publicar la plantilla.";
      toast.error(message);
    } finally {
      setPublishingTemplateId(null);
    }
  }

  function handleCopyTemplate(template: FolderTemplate, e?: React.MouseEvent) {
    e?.stopPropagation();
    setCopyingTemplate(template);
  }

  async function confirmCopyTemplate() {
    if (!copyingTemplate) return;
    const nextYear = findNextEcclesiasticalYear(
      copyingTemplate,
      ecclesiasticalYears,
    );
    if (!nextYear) {
      toast.error("No hay un año eclesiástico posterior para copiar la plantilla.");
      return;
    }

    setIsCopyingTemplate(true);
    try {
      const copied = await copyTemplateApi(copyingTemplate.template_id, {
        name: `${copyingTemplate.name} · ${nextYear.name}`,
        ecclesiastical_year_id: nextYear.ecclesiastical_year_id,
      });
      toast.success("Plantilla copiada como borrador.");
      setCopyingTemplate(null);
      setTemplates((current) => [copied, ...current]);
      setActiveTemplate(copied);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo copiar la plantilla.";
      toast.error(message);
    } finally {
      setIsCopyingTemplate(false);
    }
  }

  function handleDeleteTemplate(template: FolderTemplate, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!isDraftTemplate(template)) {
      toast.error("Solo se pueden eliminar borradores.");
      return;
    }
    setDeletingTemplate(template);
  }

  async function confirmDeleteTemplate() {
    if (!deletingTemplate) return;
    setIsDeletingTemplate(true);
    try {
      await deleteTemplate(deletingTemplate.template_id);
      toast.success("Borrador eliminado.");
      setTemplates((current) =>
        current.filter((item) => item.template_id !== deletingTemplate.template_id),
      );
      setActiveTemplate((current) =>
        current?.template_id === deletingTemplate.template_id ? null : current,
      );
      setDeletingTemplate(null);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo eliminar el borrador.";
      toast.error(message);
    } finally {
      setIsDeletingTemplate(false);
    }
  }

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
      toast.success(t("toasts.section_deleted"));
      setDeleteSectionOpen(false);
      setDeletingSection(null);
      await refreshActiveTemplate();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t("templates.errorDeleteSection");
      toast.error(message);
    } finally {
      setIsDeletingSection(false);
    }
  }

  // ─── Sections sorted by order ──────────────────────────────────────────────

  const sortedSections = [...(activeTemplate?.sections ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const sectionPointsTotal = folderTemplateSectionPointsTotal(sortedSections);
  const requiredRankingPoints = activeTemplate
    ? resolveAnnualFolderMaxPointsForTemplateScope(
        activeTemplate,
        rankingConfigs,
        localFields,
      )
    : null;
  const sectionPointsMatch =
    requiredRankingPoints != null && sectionPointsTotal === requiredRankingPoints;
  const activeTemplateIsDraft = activeTemplate
    ? isDraftTemplate(activeTemplate)
    : false;
  const activeTemplateStatusLabel = activeTemplate
    ? templateStatusLabel(activeTemplate)
    : "";

  const nextSectionOrder =
    sortedSections.length > 0
      ? Math.max(...sortedSections.map((s) => s.order)) + 1
      : 1;

  const copyTargetYear = copyingTemplate
    ? findNextEcclesiasticalYear(copyingTemplate, ecclesiasticalYears)
    : undefined;

  const templateLifecycleDialogs = (
    <>
      <TemplateFormDialog
        open={templateFormOpen}
        onOpenChange={handleTemplateFormClose}
        clubTypes={clubTypes}
        ecclesiasticalYears={ecclesiasticalYears}
        unions={unions}
        localFields={localFields}
        rankingConfigs={rankingConfigs}
        territoryScope={territoryScope}
        template={editingTemplate}
        onSuccess={handleTemplateSaved}
      />

      <AlertDialog
        open={Boolean(copyingTemplate)}
        onOpenChange={(open) => {
          if (!open && !isCopyingTemplate) setCopyingTemplate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copiar plantilla como borrador</AlertDialogTitle>
            <AlertDialogDescription>
              {copyingTemplate && copyTargetYear
                ? `Se creará un borrador para ${copyTargetYear.name} copiando secciones y puntajes de “${copyingTemplate.name}”.`
                : "No hay un año eclesiástico posterior disponible para copiar esta plantilla."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCopyingTemplate}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCopyTemplate}
              disabled={isCopyingTemplate || !copyTargetYear}
            >
              {isCopyingTemplate ? "Copiando..." : "Copiar borrador"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => {
          if (!open && !isDeletingTemplate) setDeletingTemplate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar borrador</AlertDialogTitle>
            <AlertDialogDescription>
              {`Se eliminará el borrador “${deletingTemplate?.name ?? ""}” y sus secciones. Esta acción no aplica a plantillas publicadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTemplate}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTemplate}
              disabled={isDeletingTemplate}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeletingTemplate ? "Eliminando..." : "Eliminar borrador"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // ─── Render: detail view ───────────────────────────────────────────────────

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
              title={t("templates.backTitle")}
            >
              <ArrowLeft className="size-4" />
              <span className="sr-only">{t("templates.backSrOnly")}</span>
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{activeTemplate.name}</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {activeTemplate.club_type?.name ??
                    `Tipo ${activeTemplate.club_type_id}`}
                </span>
                <span aria-hidden>·</span>
                <span>
                  {activeTemplate.ecclesiastical_year?.name ??
                    `Año ${activeTemplate.ecclesiastical_year_id}`}
                </span>
                <span aria-hidden>·</span>
                <span>
                  {sortedSections.length}{" "}
                  {sortedSections.length === 1
                    ? t("templates.sectionSingular")
                    : t("templates.sectionPlural")}
                </span>
                <span aria-hidden>·</span>
                <Badge
                  variant={templateStatusVariant(activeTemplate)}
                  className="text-xs"
                >
                  {activeTemplateStatusLabel}
                </Badge>
                {activeTemplate.closing_date && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3" />
                      {t("templates.closingDatePrefix")}:{" "}
                      {new Date(activeTemplate.closing_date).toLocaleDateString(
                        "es-AR",
                        { day: "2-digit", month: "short", year: "numeric" },
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTemplateIsDraft ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditTemplate(activeTemplate)}
                  disabled={isLoadingDetail}
                >
                  <Pencil className="size-4" />
                  Editar borrador
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddSection}
                  disabled={isLoadingDetail}
                >
                  <Plus className="size-4" />
                  {t("templates.addSection")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handlePublishTemplate(activeTemplate)}
                  disabled={
                    isLoadingDetail ||
                    !sectionPointsMatch ||
                    publishingTemplateId === activeTemplate.template_id
                  }
                  title={
                    sectionPointsMatch
                      ? "Publicar plantilla"
                      : "Primero ajustá las secciones al total requerido"
                  }
                >
                  <CheckCircle2 className="size-4" />
                  {publishingTemplateId === activeTemplate.template_id
                    ? "Publicando..."
                    : "Publicar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteTemplate(activeTemplate)}
                  disabled={isLoadingDetail}
                >
                  <Trash2 className="size-4" />
                  Eliminar borrador
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyTemplate(activeTemplate)}
              >
                <Copy className="size-4" />
                Copiar como borrador
              </Button>
            )}
          </div>
        </div>

        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            sectionPointsMatch
              ? "border-success/30 bg-success/10 text-success-foreground"
              : "border-warning/30 bg-warning/10 text-warning-foreground"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">Total requerido por ranking</span>
            <Badge variant={sectionPointsMatch ? "secondary" : "destructive"}>
              {sectionPointsTotal.toLocaleString()} /{" "}
              {(requiredRankingPoints ?? 0).toLocaleString()} pts
            </Badge>
          </div>
          <p className="mt-1 text-xs opacity-80">
            {requiredRankingPoints == null
              ? "No existe una configuración de ranking aplicable para esta plantilla. Configurá primero el componente annual_evidence_folder."
              : sectionPointsMatch
                ? "La plantilla está alineada con el puntaje anual configurado."
                : "No se podrá activar ni crear carpetas hasta que las secciones sumen exactamente el total requerido."}
          </p>
        </div>

        {isLoadingDetail ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {t("templates.loadingSections")}
          </div>
        ) : sortedSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <GripVertical className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold">
              {t("templates.noSectionsTitle")}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t("templates.noSectionsDescription")}
            </p>
            {activeTemplateIsDraft ? (
              <Button size="sm" className="mt-4" onClick={handleAddSection}>
                <Plus className="size-4" />
                {t("templates.addSection")}
              </Button>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Las plantillas publicadas quedan bloqueadas. Copiala si necesitás cambios.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop: sections table */}
            <div className="hidden rounded-lg border border-border/60 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      {t("templates.tableColOrder")}
                    </TableHead>
                    <TableHead>{t("templates.tableColName")}</TableHead>
                    <TableHead>{t("templates.tableColDescription")}</TableHead>
                    <TableHead className="w-28 text-center">
                      {t("templates.tableColRequired")}
                    </TableHead>
                    <TableHead className="w-24 text-center">
                      {t("templates.tableColMaxPts")}
                    </TableHead>
                    <TableHead className="w-20 text-right">
                      {t("templates.tableColActions")}
                    </TableHead>
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
                      <TableCell className="font-medium">
                        {section.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {section.description ?? (
                          <span className="italic text-muted-foreground/60">
                            {t("templates.noDescription")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {section.required ? (
                          <CheckCircle2 className="mx-auto size-4 text-success" />
                        ) : (
                          <Circle className="mx-auto size-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {section.max_points}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {activeTemplateIsDraft ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleEditSection(section)}
                                title={t("templates.editSection")}
                              >
                                <Pencil className="size-3.5" />
                                <span className="sr-only">
                                  {t("templates.editSection")}
                                </span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteSection(section)}
                                title={t("templates.deleteSection")}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                                <span className="sr-only">
                                  {t("templates.deleteSection")}
                                </span>
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Bloqueada
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: section cards */}
            <ul
              className="space-y-3 md:hidden"
              aria-label={t("templates.mobileListLabel")}
            >
              {sortedSections.map((section) => (
                <li key={section.section_id}>
                  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {section.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{section.name}</p>
                          {section.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {section.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {activeTemplateIsDraft && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleEditSection(section)}
                            title={t("templates.editSection")}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">
                              {t("templates.editSection")}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteSection(section)}
                            title={t("templates.deleteSection")}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">
                              {t("templates.deleteSection")}
                            </span>
                          </Button>
                        </div>
                      )}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <div>
                        <dt className="text-muted-foreground">
                          {t("templates.tableColRequired")}
                        </dt>
                        <dd className="mt-0.5">
                          {section.required ? (
                            <CheckCircle2 className="size-4 text-success" />
                          ) : (
                            <Circle className="size-4 text-muted-foreground/40" />
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          {t("templates.tableColMaxPts")}
                        </dt>
                        <dd>{section.max_points}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          </>
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

        <AlertDialog
          open={deleteSectionOpen}
          onOpenChange={setDeleteSectionOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("templates.deleteSectionTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("templates.deleteSectionDescription", {
                  name: deletingSection?.name ?? "",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingSection}>
                {t("templates.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteSection}
                disabled={isDeletingSection}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeletingSection
                  ? t("templates.deletingSectionLoading")
                  : t("templates.deleteSectionConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {templateLifecycleDialogs}
      </div>
    );
  }

  // ─── Render: templates list view ───────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {filteredTemplates.length}
            </span>
            {filteredTemplates.length !== templates.length && (
              <span className="text-muted-foreground">
                {" "}
                {t("templates.countOf")} {templates.length}
              </span>
            )}{" "}
            {templates.length === 1
              ? t("templates.templateSingular")
              : t("templates.templatePlural")}
          </p>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshTemplates}
            disabled={isRefreshing}
            title={t("templates.refresh")}
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="sr-only">{t("templates.refresh")}</span>
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingTemplate(null);
            setTemplateFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t("templates.newTemplate")}
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">
            {t("templates.filtersTitle")}
          </h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSearchInput("");
                latestParamsRef.current = "";
                router.replace(pathname);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              {t("templates.clearFilters")}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-end gap-4">
            {/* Search */}
            <div className="w-[260px] space-y-1">
              <Label htmlFor="tmpl-filter-search">
                {t("templates.filterByName")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="tmpl-filter-search"
                  placeholder={t("templates.filterByNamePlaceholder")}
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="bg-background pl-9"
                />
              </div>
            </div>

            {/* Owner tier */}
            <div className="w-[200px] space-y-1">
              <Label htmlFor="tmpl-filter-owner-tier">
                {t("templates.filterOwnerTierLabel")}
              </Label>
              <Select
                value={currentOwnerTierFilter}
                onValueChange={(val) => {
                  updateParam("owner_tier", val);
                  // Clear specific owner when switching tier
                  updateParam("owner_id", "");
                }}
              >
                <SelectTrigger
                  id="tmpl-filter-owner-tier"
                  className="bg-background"
                >
                  <SelectValue
                    placeholder={t("templates.filterOwnerTierLabel")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("templates.filterOwnerTierAll")}
                  </SelectItem>
                  <SelectItem value="union">
                    {t("templates.filterOwnerTierUnion")}
                  </SelectItem>
                  <SelectItem value="local_field">
                    {t("templates.filterOwnerTierLocalField")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px] space-y-1">
              <Label htmlFor="tmpl-filter-status">Estado</Label>
              <Select
                value={currentStatusFilter}
                onValueChange={(val) => updateParam("status", val)}
              >
                <SelectTrigger
                  id="tmpl-filter-status"
                  className="bg-background"
                >
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="DRAFT">Borradores</SelectItem>
                  <SelectItem value="PUBLISHED">Publicadas</SelectItem>
                  <SelectItem value="ARCHIVED">Archivadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Plus className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">
            {hasActiveFilters
              ? t("templates.noResultsTitle")
              : t("templates.noTemplatesTitle")}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {hasActiveFilters
              ? t("templates.noResultsDescription")
              : t("templates.noTemplatesDescription")}
          </p>
          {!hasActiveFilters && (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => {
                setEditingTemplate(null);
                setTemplateFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("templates.newTemplate")}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop: templates table */}
          <div className="hidden rounded-lg border border-border/60 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("templates.tableColName")}</TableHead>
                  <TableHead>{t("templates.tableColClubType")}</TableHead>
                  <TableHead>
                    {t("templates.tableColEcclesiasticalYear")}
                  </TableHead>
                  <TableHead>{t("templates.tableColOwner")}</TableHead>
                  <TableHead className="w-24 text-center">
                    {t("templates.tableColSections")}
                  </TableHead>
                  <TableHead className="w-16 text-center">
                    {t("templates.tableColStatus")}
                  </TableHead>
                  <TableHead className="w-16 text-right">
                    {t("templates.tableColActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow
                    key={template.template_id}
                    className="cursor-pointer"
                    onClick={() => handleOpenTemplate(template)}
                  >
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.club_type?.name ??
                        `Tipo ${template.club_type_id}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.ecclesiastical_year?.name ??
                        `Año ${template.ecclesiastical_year_id}`}
                    </TableCell>
                    <TableCell>
                      {template.owner_union_id !== null &&
                      template.owner_union_id !== undefined ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <Building2 className="size-3" />
                          {resolveOwnerLabel(template)}
                        </Badge>
                      ) : template.owner_local_field_id !== null &&
                        template.owner_local_field_id !== undefined ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <MapPin className="size-3" />
                          {resolveOwnerLabel(template)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">
                        {template.sections?.length ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={templateStatusVariant(template)}
                        className="text-xs"
                      >
                        {templateStatusLabel(template)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isDraftTemplate(template) ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => handleEditTemplate(template, e)}
                              title={t("templates.editTemplate")}
                            >
                              <Pencil className="size-3.5" />
                              <span className="sr-only">
                                {t("templates.editTemplate")}
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => handlePublishTemplate(template, e)}
                              disabled={publishingTemplateId === template.template_id}
                              title={t("templatesClientPage.publishTemplateTitle")}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span className="sr-only">Publicar plantilla</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => handleDeleteTemplate(template, e)}
                              title={t("templatesClientPage.deleteDraftTitle")}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                              <span className="sr-only">Eliminar borrador</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => handleCopyTemplate(template, e)}
                            title="Copiar como borrador"
                          >
                            <Copy className="size-3.5" />
                            <span className="sr-only">Copiar como borrador</span>
                          </Button>
                        )}
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: template cards */}
          <ul
            className="space-y-3 md:hidden"
            aria-label={t("templates.mobileTemplatesLabel")}
          >
            {filteredTemplates.map((template) => (
              <li key={template.template_id}>
                <div
                  className="w-full rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleOpenTemplate(template)}
                      aria-label={t("templates.openTemplateAriaLabel", {
                        name: template.name,
                      })}
                    >
                      <span className="block truncate font-medium">
                        {template.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {template.club_type?.name ??
                          `Tipo ${template.club_type_id}`}
                        {" · "}
                        {template.ecclesiastical_year?.name ??
                          `Año ${template.ecclesiastical_year_id}`}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge
                        variant={templateStatusVariant(template)}
                        className="text-xs"
                      >
                        {templateStatusLabel(template)}
                      </Badge>
                      {isDraftTemplate(template) ? (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => handleEditTemplate(template, e)}
                          title={t("templates.editTemplate")}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">
                            {t("templates.editTemplate")}
                          </span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => handleCopyTemplate(template, e)}
                          title="Copiar como borrador"
                        >
                          <Copy className="size-3.5" />
                          <span className="sr-only">Copiar como borrador</span>
                        </Button>
                      )}
                      <ChevronRight
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 flex w-full flex-wrap items-center gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => handleOpenTemplate(template)}
                    aria-label={t("templates.openTemplateAriaLabel", {
                      name: template.name,
                    })}
                  >
                    {template.owner_union_id !== null &&
                    template.owner_union_id !== undefined ? (
                      <Badge variant="default" className="gap-1 text-xs">
                        <Building2 className="size-3" />
                        {resolveOwnerLabel(template)}
                      </Badge>
                    ) : template.owner_local_field_id !== null &&
                      template.owner_local_field_id !== undefined ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <MapPin className="size-3" />
                        {resolveOwnerLabel(template)}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {template.sections?.length ?? 0}{" "}
                      {(template.sections?.length ?? 0) === 1
                        ? t("templates.sectionSingular")
                        : t("templates.sectionPlural")}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {templateLifecycleDialogs}
    </div>
  );
}
