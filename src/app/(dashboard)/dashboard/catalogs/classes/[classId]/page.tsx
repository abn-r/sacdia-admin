import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { UrlTabs } from "@/components/shared/url-tabs";
import { ClassModuleTree } from "@/components/classes/class-module-tree";
import { ClassHonorsDialog, type ClassHonorOption } from "@/components/classes/class-honors-dialog";
import {
  ClassPrerequisitesDialog,
  type ClassPrerequisiteOption,
} from "@/components/classes/class-prerequisites-dialog";
import { ApiError } from "@/lib/api/client";
import { getClassById } from "@/lib/api/classes";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { resolveClassDetailTab, type ClassDetailTab } from "@/lib/catalogs/classes/detail-tabs";
import { listClubTypes } from "@/lib/api/catalogs";
import { getClassHonors, type ClassHonorRelation } from "@/lib/api/class-honors";
import {
  getClassPrerequisites,
  type ClassPrerequisiteRelation,
} from "@/lib/api/class-prerequisites";
import { listAdminHonorsCatalog } from "@/lib/api/admin-honors-catalog";
import { listAdminClasses } from "@/lib/api/phase-e-catalogs";
import { unwrapApiData } from "@/lib/api/unwrap";
import type { AdminClass } from "@/lib/api/phase-e-catalogs";
import {
  extractClassDetailRoot,
  extractClassModulesFromDetail,
  sortClassStructureModules,
} from "@/lib/catalogs/classes/class-structure";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability } from "@/lib/auth/screen-catalog";

type Params = Promise<{ classId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function CatalogClassDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("classes.pages.detail");
  const statusT = await getTranslations("classes.status");
  const tNavCatalogs = await getTranslations("nav.items");
  const catalogT = await getTranslations("catalogs.pages.classes");
  const tTabs = await getTranslations("admin.catalogs.classDetail");

  const { classId: classIdParam } = await params;
  const rawSearch = await searchParams;
  const activeTab: ClassDetailTab = resolveClassDetailTab(rawSearch.tab);
  const classId = toPositiveNumber(classIdParam);
  if (!classId) notFound();

  const canManageRelations = canCapability(user, "catalogs-classes", "create");
  const canUpdateRelations = canCapability(user, "catalogs-classes", "update");
  const canDeleteRelations = canCapability(user, "catalogs-classes", "delete");

  const clubTypeNameById = new Map<number, string>();
  try {
    const clubTypes = await listClubTypes();
    for (const clubType of clubTypes) {
      clubTypeNameById.set(clubType.club_type_id, clubType.name.trim());
    }
  } catch {
    // Best-effort lookup only.
  }

  let className = `Clase #${classId}`;
  let description: string | null = null;
  let clubTypeName = "—";
  let isActive = true;
  let modules = sortClassStructureModules([]);
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    const payload = await getClassById(classId);
    const classData = extractClassDetailRoot(payload);
    if (!classData) notFound();

    className = toText(classData.name) ?? className;
    description = toText(classData.description);
    const clubTypeId = toPositiveNumber(classData.club_type_id);
    clubTypeName = clubTypeId
      ? (clubTypeNameById.get(clubTypeId) ?? `Tipo #${clubTypeId}`)
      : "—";
    isActive = classData.active !== false;
    modules = sortClassStructureModules(extractClassModulesFromDetail(classData));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    loadFailure = catalogLoadFailure(error);
  }

  let honorRelations: ClassHonorRelation[] = [];
  let honorOptions: ClassHonorOption[] = [];
  try {
    const [relations, honorsCatalog] = await Promise.all([
      getClassHonors(classId, { active: true }),
      listAdminHonorsCatalog(),
    ]);
    honorRelations = relations;
    honorOptions = honorsCatalog
      .filter((honor) => honor.active !== false)
      .map((honor) => ({ honor_id: honor.honor_id, name: honor.name }));
  } catch {
    // Best-effort: relation management degrades gracefully if unavailable.
  }

  let prerequisiteRelations: ClassPrerequisiteRelation[] = [];
  let classOptions: ClassPrerequisiteOption[] = [];
  try {
    const [prerequisites, classesPayload] = await Promise.all([
      getClassPrerequisites(classId, { active: true }),
      listAdminClasses(),
    ]);
    prerequisiteRelations = prerequisites;
    const allClasses = unwrapApiData<AdminClass[]>(classesPayload);
    classOptions = allClasses
      .filter((klass) => klass.active !== false && klass.class_id !== classId)
      .map((klass) => ({ class_id: klass.class_id, name: klass.name }));
  } catch {
    // Best-effort: relation management degrades gracefully if unavailable.
  }

  const moduleOptions = modules.map((mod) => ({
    module_id: mod.module_id,
    name: (mod.title ?? mod.name).trim() || `Módulo #${mod.module_id}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={className}
        description={[clubTypeName, description].filter(Boolean).join(" · ")}
        breadcrumbs={[
          { label: tNavCatalogs("catalogs_root"), href: "/dashboard/catalogs" },
          { label: catalogT("title"), href: "/dashboard/catalogs/classes" },
          { label: className },
        ]}
        actions={
          isActive ? undefined : (
            <StatusBadge intent={flagStatusIntent(false)} label={statusT("inactive")} />
          )
        }
      />

      <UrlTabs
        ariaLabel={tTabs("ariaLabel")}
        defaultValue="modules"
        tabs={[
          { value: "modules", label: tTabs("modules"), count: modules.length },
          { value: "honors", label: tTabs("honors"), count: honorRelations.length },
          { value: "prerequisites", label: tTabs("prerequisites"), count: prerequisiteRelations.length },
        ]}
      />

      {activeTab === "modules" ? (
        loadFailure ? (
          <ErrorState
            kind={loadFailure.kind}
            retry
            {...(loadFailure.detail ? { detail: loadFailure.detail } : {})}
          />
        ) : (
          <Card>
            <CardContent>
              <ClassModuleTree modules={modules} honorRelations={honorRelations} />
            </CardContent>
          </Card>
        )
      ) : null}

      {activeTab === "honors" ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
            {tTabs("honorsNote")}
          </p>
          <ClassHonorsDialog
            inline
            classId={classId}
            initialRelations={honorRelations}
            honorsCatalog={honorOptions}
            modules={moduleOptions}
            canCreate={canManageRelations}
            canUpdate={canUpdateRelations}
            canDelete={canDeleteRelations}
          />
        </div>
      ) : null}

      {activeTab === "prerequisites" ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
            {tTabs("prerequisitesNote")}
          </p>
          <ClassPrerequisitesDialog
            inline
            classId={classId}
            initialPrerequisites={prerequisiteRelations}
            classOptions={classOptions}
            canCreate={canManageRelations}
            canDelete={canDeleteRelations}
          />
        </div>
      ) : null}
    </div>
  );
}
