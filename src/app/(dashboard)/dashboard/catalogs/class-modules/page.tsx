import { BookOpen } from "lucide-react";
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
import { listAdminClassModules, listAdminClasses } from "@/lib/api/phase-e-catalogs";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import {
  sortClassModuleParentsForDisplay,
  sortClassModulesByClubTypeClassAndName,
  sortClubTypesForDisplay,
} from "@/lib/catalogs/club-ideals/sort";
import { extractItems, extractMeta, readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { CATALOGS_CREATE, CATALOGS_UPDATE, CATALOGS_DELETE, CLASS_MODULES_MANAGE } from "@/lib/auth/permissions";
import {
  createClassModuleAction,
  updateClassModuleAction,
  deleteClassModuleAction,
} from "@/lib/phase-e-catalogs/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readClassId(item: Record<string, unknown>): number | null {
  const raw = item.class_id;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default async function AdminClassModulesPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("catalogs.pages.classModules");
  const user = await requireAdminUser();
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");
  const clubTypeId = readPositiveNumberParam(raw, "club_type_id");
  const classId = readPositiveNumberParam(raw, "class_id");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let classModuleParentOptions: Array<{ class_id: number; name: string; club_type_id: number }> = [];
  let clubTypes: Array<{ club_type_id: number; name: string }> = [];

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const [payload, classes, types] = await Promise.all([
      listAdminClassModules(params),
      listAdminClasses().catch(() => []),
      listAdminClubTypes().catch(() => []),
    ]);

    const classItems = extractItems(classes);
    classModuleParentOptions = sortClassModuleParentsForDisplay(
      classItems
        .map((item) => {
          const class_id = readClassId(item);
          const club_type_id =
            typeof item.club_type_id === "number"
              ? item.club_type_id
              : Number(item.club_type_id);
          const name = typeof item.name === "string" ? item.name : "";
          if (!class_id || !Number.isFinite(club_type_id) || !name) return null;
          return { class_id, name, club_type_id };
        })
        .filter((item): item is { class_id: number; name: string; club_type_id: number } => item !== null),
      types,
    );

    const classMetaById = new Map(
      classModuleParentOptions.map((parent) => [parent.class_id, parent]),
    );

    items = extractItems(payload).map((item) => {
      const parentClassId = readClassId(item);
      const parent = parentClassId ? classMetaById.get(parentClassId) : undefined;
      if (!parent) return item;
      return {
        ...item,
        club_type_id: parent.club_type_id,
        class_name: parent.name,
      };
    });

    if (clubTypeId) {
      items = items.filter((item) => {
        const rawTypeId = item.club_type_id;
        const parsed = typeof rawTypeId === "number" ? rawTypeId : Number(rawTypeId);
        return Number.isFinite(parsed) && parsed === clubTypeId;
      });
    }

    if (classId) {
      items = items.filter((item) => readClassId(item) === classId);
    }

    items = sortClassModulesByClubTypeClassAndName(items, classModuleParentOptions, types);
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

  const canCreate = hasAnyPermission(user, [CLASS_MODULES_MANAGE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [CLASS_MODULES_MANAGE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [CLASS_MODULES_MANAGE, CATALOGS_DELETE]);

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <PhaseECatalogCrudPage
        title={t("title")}
        description={t("description")}
        entityLabel={t("entityLabel")}
        emptyIcon={<BookOpen />}
        includeDescription={true}
        idField="module_id"
        nameField="name"
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createClassModuleAction}
        updateAction={updateClassModuleAction}
        deleteAction={deleteClassModuleAction}
        classClubTypeOptions={clubTypes}
        classModuleParentOptions={classModuleParentOptions}
      />
    </div>
  );
}
