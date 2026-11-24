"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Copy, FileStack, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnnualFolderSetupNotice } from "@/components/annual-folders/annual-folder-setup-notice";
import { TemplateFormDialog } from "@/components/annual-folders/template-form-dialog";
import type { SectionFormDialogProps } from "@/components/annual-folders/section-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { DetailHeader } from "@/components/shared/detail-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { PageHeader } from "@/components/shared/page-header";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import {
  copyTemplate as copyTemplateApi,
  deleteTemplate,
  deleteTemplateSection,
  getTemplate,
  listTemplates,
  updateTemplate,
} from "@/lib/api/annual-folders";
import type {
  FolderTemplate,
  FolderTemplateSection,
} from "@/lib/api/annual-folders";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";
import { ApiError } from "@/lib/api/client";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import { errorStateFromError } from "@/lib/api/error-state";
import type { LocalField, Union } from "@/lib/api/geography";
import {
  folderTemplateSectionPointsTotal,
  resolveAnnualFolderMaxPointsForTemplateScope,
} from "@/lib/annual-folders/ranking-budget";
import { resolveTemplateYearLabel } from "@/lib/annual-folders/ecclesiastical-year-label";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import {
  CLUBS_EVIDENCE_FOLDERS_BASE,
  CLUBS_EVIDENCE_FOLDERS_TEMPLATES,
} from "@/lib/clubs/evidence-folders-paths";
import { formatCalendarDate, useFormatNumber } from "@/lib/format-locale";
import { findAnnualFolderSetupGap } from "@/lib/prerequisites/annual-folder-gaps";
import {
  canPublish,
  publishReadiness,
} from "@/lib/evidence-folders/template-readiness";

const SectionFormDialog = dynamic<SectionFormDialogProps>(
  () =>
    import("@/components/annual-folders/section-form-dialog").then((m) => ({
      default: m.SectionFormDialog,
    })),
  { ssr: false, loading: () => null },
);

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";
const ALL = "all";

type TemplateStatus = NonNullable<FolderTemplate["status"]>;
type StatusFilter = typeof ALL | TemplateStatus;
type OwnerTierFilter = typeof ALL | "union" | "local_field";

interface TemplatesClientPageProps {
  initialTemplates: FolderTemplate[];
  rankingConfigs: AnnualRankingConfig[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  unions: Union[];
  localFields: LocalField[];
  territoryScope: AdminTerritoryScope;
}

function statusOf(template: FolderTemplate): TemplateStatus {
  return template.status ?? (template.active ? "PUBLISHED" : "DRAFT");
}

function ownerLabel(template: FolderTemplate): string {
  if (template.owner_union_id != null) {
    return template.owner_union?.name ?? `#${template.owner_union_id}`;
  }
  if (template.owner_local_field_id != null) {
    return template.owner_local_field?.name ?? `#${template.owner_local_field_id}`;
  }
  return "—";
}

function nextYearOf(template: FolderTemplate, years: EcclesiasticalYear[]) {
  const sorted = [...years].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const index = sorted.findIndex(
    (year) => year.ecclesiastical_year_id === template.ecclesiastical_year_id,
  );
  return index >= 0 ? sorted[index + 1] : undefined;
}

export function TemplatesClientPage({
  initialTemplates,
  rankingConfigs,
  clubTypes,
  ecclesiasticalYears,
  unions,
  localFields,
  territoryScope,
}: TemplatesClientPageProps) {
  const t = useTranslations("evaluation.evidence.templates");
  const tList = useTranslations("annual_folders.templates");
  const tPage = useTranslations("annual_folders.pageTemplates");
  const tFolders = useTranslations("annual_folders");
  const tPageFolders = useTranslations("annual_folders.pageFolders");
  const locale = useLocale();
  const formatNumber = useFormatNumber();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canCapability } = useScreenAccess();
  const canDeleteDraft = canCapability("clubs-evidence-folders-templates", "delete_draft");
  const canDeleteSection = canCapability("clubs-evidence-folders-templates", "delete_section");

  const [templates, setTemplates] = useState<FolderTemplate[]>(initialTemplates);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const [ownerTier, setOwnerTier] = useState<OwnerTierFilter>(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FolderTemplate | null>(null);
  const [publishing, setPublishing] = useState<FolderTemplate | null>(null);
  const [copying, setCopying] = useState<FolderTemplate | null>(null);
  const [deleting, setDeleting] = useState<FolderTemplate | null>(null);
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FolderTemplateSection | null>(null);
  const [deletingSection, setDeletingSection] = useState<FolderTemplateSection | null>(null);

  const activeId = searchParams?.get("template") ?? null;
  const detailQuery = useQuery<FolderTemplate, Error>({
    queryKey: ["evidence-folders", "template", activeId],
    queryFn: () => getTemplate(activeId as string),
    enabled: activeId !== null,
    staleTime: 15_000,
  });

  const setupGap = findAnnualFolderSetupGap({
    ecclesiasticalYears,
    clubTypes,
    templates,
    rankingConfigs,
    includeTemplateGap: false,
  });
  const cannotCreate = setupGap?.id === "years" || setupGap?.id === "club-types";

  const yearLabel = (template: FolderTemplate) =>
    resolveTemplateYearLabel(template, ecclesiasticalYears, (id) =>
      tList("yearFallback", { id }),
    );
  const clubTypeLabel = (template: FolderTemplate) =>
    template.club_type?.name ??
    clubTypes.find((type) => type.club_type_id === template.club_type_id)?.name ??
    `#${template.club_type_id}`;

  const statusLabels = {
    DRAFT: t("status.draft"),
    PUBLISHED: t("status.published"),
    ARCHIVED: t("status.archived"),
  } satisfies Record<TemplateStatus, string>;

  function statusMark(template: FolderTemplate) {
    return (
      <ExceptionStatus
        value={statusOf(template)}
        normal={["PUBLISHED"]}
        labels={statusLabels}
        intents={{ DRAFT: "neutral", ARCHIVED: "neutral" }}
      />
    );
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return templates.filter((template) => {
      if (needle && !template.name.toLowerCase().includes(needle)) return false;
      if (statusFilter !== ALL && statusOf(template) !== statusFilter) return false;
      if (ownerTier === "union" && template.owner_union_id == null) return false;
      if (ownerTier === "local_field" && template.owner_local_field_id == null) return false;
      return true;
    });
  }, [templates, search, statusFilter, ownerTier]);
  const isFiltered = search.trim() !== "" || statusFilter !== ALL || ownerTier !== ALL;

  function openTemplate(id: string | null) {
    router.push(id ? `${pathname}?template=${id}` : pathname, { scroll: false });
  }

  async function reloadList() {
    try {
      setTemplates(await listTemplates());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("refreshFailed"));
    }
  }

  async function afterSave() {
    await Promise.all([reloadList(), activeId ? detailQuery.refetch() : Promise.resolve()]);
  }

  function failure(error: unknown, fallback: string): Error {
    return new Error(error instanceof ApiError && error.message ? error.message : fallback);
  }

  async function publish(template: FolderTemplate) {
    try {
      const updated = await updateTemplate(template.template_id, { active: true });
      setTemplates((current) =>
        current.map((item) => (item.template_id === updated.template_id ? updated : item)),
      );
    } catch (error) {
      throw failure(error, t("publish.failed"));
    }
    toast.success(t("publish.done"));
    if (activeId) await detailQuery.refetch();
  }

  async function copy(template: FolderTemplate) {
    const nextYear = nextYearOf(template, ecclesiasticalYears);
    if (!nextYear) throw new Error(t("copy.noYear"));
    try {
      const copied = await copyTemplateApi(template.template_id, {
        name: `${template.name} · ${nextYear.name}`,
        ecclesiastical_year_id: nextYear.ecclesiastical_year_id,
      });
      setTemplates((current) => [copied, ...current]);
      toast.success(t("copy.done"));
      openTemplate(copied.template_id);
    } catch (error) {
      throw failure(error, t("copy.failed"));
    }
  }

  async function remove(template: FolderTemplate) {
    try {
      await deleteTemplate(template.template_id);
    } catch (error) {
      throw failure(error, t("delete.failed"));
    }
    setTemplates((current) => current.filter((item) => item.template_id !== template.template_id));
    toast.success(t("delete.done"));
    if (activeId === template.template_id) openTemplate(null);
  }

  async function removeSection(section: FolderTemplateSection) {
    try {
      await deleteTemplateSection(section.section_id);
    } catch (error) {
      throw failure(error, tList("errorDeleteSection"));
    }
    toast.success(tFolders("toasts.section_deleted"));
    await afterSave();
  }

  /** `headerMenu`: publish and copy are buttons there, so the menu keeps the rest. */
  function templateActions(template: FolderTemplate, headerMenu = false) {
    const draft = statusOf(template) === "DRAFT";
    return [
      {
        label: t("actions.edit"),
        icon: Pencil,
        hidden: !draft,
        onSelect: () => {
          setEditing(template);
          setFormOpen(true);
        },
      },
      {
        label: t("actions.publish"),
        hidden: !draft || headerMenu,
        onSelect: () => setPublishing(template),
      },
      {
        label: t("actions.copy"),
        icon: Copy,
        hidden: draft || headerMenu || !nextYearOf(template, ecclesiasticalYears),
        onSelect: () => setCopying(template),
      },
      {
        label: t("actions.delete"),
        icon: Trash2,
        destructive: true,
        hidden: !draft || !canDeleteDraft,
        onSelect: () => setDeleting(template),
      },
    ];
  }

  const dialogs = (
    <>
      <TemplateFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        clubTypes={clubTypes}
        ecclesiasticalYears={ecclesiasticalYears}
        unions={unions}
        localFields={localFields}
        rankingConfigs={rankingConfigs}
        territoryScope={territoryScope}
        template={editing}
        onSuccess={afterSave}
      />
      <ConfirmDialog
        open={publishing !== null}
        onOpenChange={(open) => !open && setPublishing(null)}
        title={t("publish.title", { name: publishing?.name ?? "" })}
        description={t("publish.description")}
        confirmLabel={t("publish.confirm")}
        onConfirm={() => (publishing ? publish(publishing) : undefined)}
      />
      <ConfirmDialog
        open={copying !== null}
        onOpenChange={(open) => !open && setCopying(null)}
        title={t("copy.title")}
        description={
          copying
            ? t("copy.description", {
                name: copying.name,
                year: nextYearOf(copying, ecclesiasticalYears)?.name ?? "",
              })
            : ""
        }
        confirmLabel={t("copy.confirm")}
        onConfirm={() => (copying ? copy(copying) : undefined)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="destructive"
        title={t("delete.title")}
        description={t("delete.description", { name: deleting?.name ?? "" })}
        confirmLabel={t("delete.confirm")}
        onConfirm={() => (deleting ? remove(deleting) : undefined)}
      />
      <ConfirmDialog
        open={deletingSection !== null}
        onOpenChange={(open) => !open && setDeletingSection(null)}
        tone="destructive"
        title={tList("deleteSectionTitle")}
        description={tList("deleteSectionDescription", { name: deletingSection?.name ?? "" })}
        confirmLabel={tList("deleteSectionConfirm")}
        onConfirm={() => (deletingSection ? removeSection(deletingSection) : undefined)}
      />
    </>
  );

  // ─── Detail ────────────────────────────────────────────────────────────────

  if (activeId !== null) {
    const breadcrumbs = [
      { label: tPageFolders("titleList"), href: CLUBS_EVIDENCE_FOLDERS_BASE },
      { label: tPage("title"), href: CLUBS_EVIDENCE_FOLDERS_TEMPLATES },
    ];

    if (detailQuery.isPending) {
      return (
        <div className="space-y-4" role="status" aria-busy="true">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      );
    }

    if (!detailQuery.data) {
      const state = errorStateFromError(detailQuery.error);
      return (
        <div className="space-y-4">
          <PageHeader breadcrumbs={[...breadcrumbs, { label: "…" }]} />
          <ErrorState
            kind={state.kind}
            icon={FileStack}
            title={t("error.title")}
            description={t("error.description")}
            {...(state.detail ? { detail: state.detail } : {})}
            onRetry={() => void detailQuery.refetch()}
          />
        </div>
      );
    }

    const template = detailQuery.data;
    const draft = statusOf(template) === "DRAFT";
    const sections = [...(template.sections ?? [])].sort((a, b) => a.order - b.order);
    const total = folderTemplateSectionPointsTotal(sections);
    const required = resolveAnnualFolderMaxPointsForTemplateScope(template, rankingConfigs, localFields);
    const readiness = publishReadiness(total, required);
    const nextOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order)) + 1 : 1;
    const points = (value: number) => formatNumber(value);
    const readinessText =
      readiness.state === "noConfig"
        ? t("readiness.noConfig")
        : t(`readiness.${readiness.state}`, {
            total: points(readiness.total),
            required: points(readiness.required),
            diff: readiness.state === "ready" ? "" : points(readiness.diff),
          });
    const nextYear = nextYearOf(template, ecclesiasticalYears);

    return (
      <div className="space-y-5">
        <DetailHeader
          breadcrumbs={[...breadcrumbs, { label: template.name }]}
          title={template.name}
          subtitle={[clubTypeLabel(template), yearLabel(template), ownerLabel(template)].join(" · ")}
          facts={[
            { label: t("facts.sections"), value: sections.length },
            ...(template.closing_date
              ? [{ label: t("facts.closing"), value: formatCalendarDate(template.closing_date, locale) }]
              : []),
          ]}
          actions={
            <>
              {statusMark(template)}
              {draft ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingSection(null);
                      setSectionFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                    {t("actions.addSection")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!canPublish(readiness)}
                    title={canPublish(readiness) ? undefined : t("publish.blocked")}
                    onClick={() => setPublishing(template)}
                  >
                    {t("actions.publish")}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!nextYear}
                  title={nextYear ? undefined : t("copy.noYear")}
                  onClick={() => setCopying(template)}
                >
                  <Copy className="size-4" />
                  {t("actions.copy")}
                </Button>
              )}
              <RowActions
                label={template.name}
                actions={templateActions(template, true)}
              />
            </>
          }
        />

        {draft ? (
          <p
            role="status"
            className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground"
          >
            {readinessText}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("sections.locked")}</p>
        )}

        {sections.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title={tList("noSectionsTitle")}
            description={tList("noSectionsDescription")}
          >
            {draft ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditingSection(null);
                  setSectionFormOpen(true);
                }}
              >
                <Plus className="size-4" />
                {t("actions.addSection")}
              </Button>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <DataTableShell className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={`${HEAD} w-12`}>{t("sections.order")}</TableHead>
                    <TableHead className={HEAD}>{t("sections.name")}</TableHead>
                    <TableHead className={HEAD}>{t("sections.required")}</TableHead>
                    <TableHead className={`${HEAD} text-right`}>{t("sections.points")}</TableHead>
                    <TableHead className={`${HEAD} text-right`}>{t("sections.minimum")}</TableHead>
                    {draft ? <RowActionsHead /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section, index) => (
                    <TableRow key={section.section_id}>
                      <TableCell className="px-3 text-muted-foreground tabular-nums">{index + 1}</TableCell>
                      <TableCell className="px-3 font-medium">{section.name}</TableCell>
                      <TableCell className="px-3">
                        {section.required ? t("sections.yes") : <span className="text-muted-foreground">{t("sections.no")}</span>}
                      </TableCell>
                      <TableCell className="px-3 text-right tabular-nums">{points(section.max_points)}</TableCell>
                      <TableCell className="px-3 text-right tabular-nums">
                        {section.minimum_points ? points(section.minimum_points) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      {draft ? (
                        <TableCell className="px-3">
                          <RowActions
                            label={section.name}
                            actions={[
                              {
                                label: t("actions.editSection"),
                                icon: Pencil,
                                onSelect: () => {
                                  setEditingSection(section);
                                  setSectionFormOpen(true);
                                },
                              },
                              {
                                label: t("actions.deleteSection"),
                                icon: Trash2,
                                destructive: true,
                                hidden: !canDeleteSection,
                                onSelect: () => setDeletingSection(section),
                              },
                            ]}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>

            <ul className="divide-y rounded-xl bg-card shadow-card md:hidden" aria-label={t("sections.listLabel")}>
              {sections.map((section, index) => (
                <li key={section.section_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {index + 1}. {section.name}
                    </p>
                    <p className="flex gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                      <span>{points(section.max_points)} pts</span>
                      <span>{section.required ? t("sections.required") : t("sections.no")}</span>
                    </p>
                  </div>
                  {draft ? (
                    <RowActions
                      label={section.name}
                      actions={[
                        {
                          label: t("actions.editSection"),
                          icon: Pencil,
                          onSelect: () => {
                            setEditingSection(section);
                            setSectionFormOpen(true);
                          },
                        },
                        {
                          label: t("actions.deleteSection"),
                          icon: Trash2,
                          destructive: true,
                          hidden: !canDeleteSection,
                          onSelect: () => setDeletingSection(section),
                        },
                      ]}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}

        <SectionFormDialog
          open={sectionFormOpen}
          onOpenChange={setSectionFormOpen}
          templateId={template.template_id}
          section={editingSection}
          nextOrder={nextOrder}
          onSuccess={afterSave}
        />
        {dialogs}
      </div>
    );
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <PageHeader
        title={tPage("title")}
        description={t("count", { count: templates.length })}
        breadcrumbs={[
          { label: tPageFolders("titleList"), href: CLUBS_EVIDENCE_FOLDERS_BASE },
          { label: tPage("title") },
        ]}
        actions={
          <Button
            size="sm"
            disabled={cannotCreate}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            {tList("newTemplate")}
          </Button>
        }
      />

      <AnnualFolderSetupNotice gap={setupGap} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="templates-search" className="text-xs text-muted-foreground">
            {tList("filterByName")}
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="templates-search"
              type="search"
              value={search}
              maxLength={100}
              placeholder={tList("filterByNamePlaceholder")}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-[200px]">
          <Label htmlFor="templates-status" className="text-xs text-muted-foreground">
            {t("filters.status")}
          </Label>
          <NativeSelect
            id="templates-status"
            className="w-full"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value={ALL}>{t("filters.all")}</option>
            <option value="DRAFT">{t("filters.draft")}</option>
            <option value="PUBLISHED">{t("filters.published")}</option>
            <option value="ARCHIVED">{t("filters.archived")}</option>
          </NativeSelect>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-[200px]">
          <Label htmlFor="templates-owner" className="text-xs text-muted-foreground">
            {tList("filterOwnerTierLabel")}
          </Label>
          <NativeSelect
            id="templates-owner"
            className="w-full"
            value={ownerTier}
            onChange={(event) => setOwnerTier(event.target.value as OwnerTierFilter)}
          >
            <option value={ALL}>{tList("filterOwnerTierAll")}</option>
            <option value="union">{tList("filterOwnerTierUnion")}</option>
            <option value="local_field">{tList("filterOwnerTierLocalField")}</option>
          </NativeSelect>
        </div>
      </div>

      {filtered.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={Search}
            variant="no-results"
            title={tList("noResultsTitle")}
            description={tList("noResultsDescription")}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter(ALL);
                setOwnerTier(ALL);
              }}
            >
              {tList("clearFilters")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={FileStack}
            title={tList("noTemplatesTitle")}
            description={tList("noTemplatesDescription")}
          >
            {!cannotCreate ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" />
                {tList("newTemplate")}
              </Button>
            ) : null}
          </EmptyState>
        )
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>{tList("tableColName")}</TableHead>
                  <TableHead className={HEAD}>{tList("tableColClubType")}</TableHead>
                  <TableHead className={HEAD}>{tList("tableColEcclesiasticalYear")}</TableHead>
                  <TableHead className={HEAD}>{tList("tableColOwner")}</TableHead>
                  <TableHead className={`${HEAD} text-right`}>{t("columns.sections")}</TableHead>
                  <TableHead className={HEAD}>{tList("tableColStatus")}</TableHead>
                  <RowActionsHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((template) => (
                  <TableRow key={template.template_id}>
                    <TableCell className="px-3">
                      <Link
                        href={`${pathname}?template=${template.template_id}`}
                        className="font-medium hover:underline"
                      >
                        {template.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 text-muted-foreground">{clubTypeLabel(template)}</TableCell>
                    <TableCell className="px-3 text-muted-foreground tabular-nums">{yearLabel(template)}</TableCell>
                    <TableCell className="px-3 text-muted-foreground">{ownerLabel(template)}</TableCell>
                    <TableCell className="px-3 text-right tabular-nums">
                      {template.sections?.length ?? "—"}
                    </TableCell>
                    <TableCell className="px-3">{statusMark(template)}</TableCell>
                    <TableCell className="px-3">
                      <RowActions label={template.name} actions={templateActions(template)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="divide-y rounded-xl bg-card shadow-card md:hidden" aria-label={tList("mobileTemplatesLabel")}>
            {filtered.map((template) => (
              <li key={template.template_id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`${pathname}?template=${template.template_id}`}
                      className="truncate text-sm font-medium"
                    >
                      {template.name}
                    </Link>
                    {statusMark(template)}
                  </div>
                  <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                    <span>{clubTypeLabel(template)}</span>
                    <span>{yearLabel(template)}</span>
                    <span>{ownerLabel(template)}</span>
                  </p>
                </div>
                <RowActions label={template.name} actions={templateActions(template)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {dialogs}
    </div>
  );
}
