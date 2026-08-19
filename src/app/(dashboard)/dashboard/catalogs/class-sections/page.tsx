import { Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";

const PhaseECatalogCrudPage = dynamic(
  () =>
    import("@/components/catalogs/phase-e-catalog-crud-page").then((m) => ({
      default: m.PhaseECatalogCrudPage,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    ),
  }
);
import { ApiError } from "@/lib/api/client";
import {
  listAdminClassSections,
  listAdminClassModules,
  listAdminClasses,
} from "@/lib/api/phase-e-catalogs";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import {
  sortClassSectionModulesForDisplay,
  sortClassSectionsByClubTypeClassModuleAndName,
  sortClubTypesForDisplay,
} from "@/lib/catalogs/club-ideals/sort";
import { extractItems, extractMeta, readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { CATALOGS_CREATE, CATALOGS_UPDATE, CATALOGS_DELETE, CLASS_SECTIONS_MANAGE } from "@/lib/auth/permissions";
import {
  createClassSectionAction,
  updateClassSectionAction,
  deleteClassSectionAction,
} from "@/lib/phase-e-catalogs/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readNumericId(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminClassSectionsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("catalogs.pages.classSections");
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");
  const clubTypeId = readPositiveNumberParam(raw, "club_type_id");
  const classId = readPositiveNumberParam(raw, "class_id");
  const moduleId = readPositiveNumberParam(raw, "module_id");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let classSectionModuleOptions: Array<{
    module_id: number;
    name: string;
    class_id: number;
    class_name: string;
    club_type_id: number;
  }> = [];
  let clubTypes: Array<{ club_type_id: number; name: string }> = [];

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const [payload, modules, classes, types] = await Promise.all([
      listAdminClassSections(params),
      listAdminClassModules().catch(() => []),
      listAdminClasses().catch(() => []),
      listAdminClubTypes().catch(() => []),
    ]);

    const classItems = extractItems(classes);
    const classMetaById = new Map(
      classItems
        .map((item) => {
          const class_id = readNumericId(item.class_id);
          const club_type_id = readNumericId(item.club_type_id);
          const name = typeof item.name === "string" ? item.name : "";
          if (!class_id || !club_type_id || !name) return null;
          return [class_id, { class_id, name, club_type_id }] as const;
        })
        .filter((entry): entry is readonly [number, { class_id: number; name: string; club_type_id: number }] => entry !== null),
    );

    classSectionModuleOptions = sortClassSectionModulesForDisplay(
      extractItems(modules)
        .map((item) => {
          const module_id = readNumericId(item.module_id);
          const class_id = readNumericId(item.class_id);
          const name = typeof item.name === "string" ? item.name : "";
          const parentClass = class_id ? classMetaById.get(class_id) : undefined;
          if (!module_id || !parentClass || !name) return null;
          return {
            module_id,
            name,
            class_id: parentClass.class_id,
            class_name: parentClass.name,
            club_type_id: parentClass.club_type_id,
          };
        })
        .filter(
          (
            item,
          ): item is {
            module_id: number;
            name: string;
            class_id: number;
            class_name: string;
            club_type_id: number;
          } => item !== null,
        ),
      types,
    );

    const moduleMetaById = new Map(
      classSectionModuleOptions.map((moduleOption) => [moduleOption.module_id, moduleOption]),
    );

    items = extractItems(payload).map((item) => {
      const parentModuleId = readNumericId(item.module_id);
      const parent = parentModuleId ? moduleMetaById.get(parentModuleId) : undefined;
      if (!parent) return item;
      return {
        ...item,
        module_name: parent.name,
        class_id: parent.class_id,
        class_name: parent.class_name,
        club_type_id: parent.club_type_id,
      };
    });

    if (clubTypeId) {
      items = items.filter((item) => readNumericId(item.club_type_id) === clubTypeId);
    }

    if (classId) {
      items = items.filter((item) => readNumericId(item.class_id) === classId);
    }

    if (moduleId) {
      items = items.filter((item) => readNumericId(item.module_id) === moduleId);
    }

    items = sortClassSectionsByClubTypeClassModuleAndName(items, classSectionModuleOptions, types);
    meta = extractMeta(payload, page, limit, items.length);
    clubTypes = sortClubTypesForDisplay(types).map((type) => ({
      club_type_id: type.club_type_id,
      name: type.name,
    }));
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [CLASS_SECTIONS_MANAGE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [CLASS_SECTIONS_MANAGE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [CLASS_SECTIONS_MANAGE, CATALOGS_DELETE]);

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <PhaseECatalogCrudPage
        title={t("title")}
        description={t("description")}
        entityLabel={t("entityLabel")}
        emptyIcon={<Layers />}
        includeDescription={true}
        idField="section_id"
        nameField="name"
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createClassSectionAction}
        updateAction={updateClassSectionAction}
        deleteAction={deleteClassSectionAction}
        classClubTypeOptions={clubTypes}
        classSectionModuleOptions={classSectionModuleOptions}
      />
    </div>
  );
}
