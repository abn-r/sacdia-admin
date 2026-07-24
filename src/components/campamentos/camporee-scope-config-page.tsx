import Link from "next/link";
import { Flag, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { listAdminCamporeeEventTypes } from "@/lib/api/generic-catalogs-i18n";
import {
  extractItems,
  extractMeta,
  readParam,
  readPositiveNumberParam,
} from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENT_TYPES_CREATE,
  CAMPOREE_EVENT_TYPES_UPDATE,
  CAMPOREE_EVENT_TYPES_DELETE,
  CATALOGS_CREATE,
  CATALOGS_UPDATE,
  CATALOGS_DELETE,
} from "@/lib/auth/permissions";
import {
  createCamporeeEventTypeAction,
  updateCamporeeEventTypeAction,
  deleteCamporeeEventTypeAction,
} from "@/lib/generic-catalogs-i18n/actions";

const PhaseECatalogCrudPage = dynamic(
  () =>
    import("@/components/catalogs/phase-e-catalog-crud-page").then((m) => ({
      default: m.PhaseECatalogCrudPage,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    ),
  },
);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export type CamporeeConfigScope = "local_field" | "union";

interface CamporeeScopeConfigPageProps {
  scope: CamporeeConfigScope;
  searchParams: SearchParams;
}

export async function CamporeeScopeConfigPage({
  scope,
  searchParams,
}: CamporeeScopeConfigPageProps) {
  const user = await requireAdminUser();
  const tScope = await getTranslations(
    scope === "union"
      ? "campamentos.pages.configUnion"
      : "campamentos.pages.configLocalField",
  );
  const tCatalog = await getTranslations("catalogs.pages.camporeeEventTypes");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "q");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;

  try {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    const payload = await listAdminCamporeeEventTypes(params);
    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : tCatalog("loadError");
  }

  const canCreate = hasAnyPermission(user, [
    CAMPOREE_EVENT_TYPES_CREATE,
    CATALOGS_CREATE,
  ]);
  const canEdit = hasAnyPermission(user, [
    CAMPOREE_EVENT_TYPES_UPDATE,
    CATALOGS_UPDATE,
  ]);
  const canDelete = hasAnyPermission(user, [
    CAMPOREE_EVENT_TYPES_DELETE,
    CATALOGS_DELETE,
  ]);

  const templateScope = scope === "union" ? "union" : "local_field";

  return (
    <div className="space-y-6">
      <PageHeader
        title={tScope("title")}
        description={tScope("description")}
        breadcrumbs={[
          { label: tScope("breadcrumbRoot"), href: "/dashboard/campamentos" },
          { label: tScope("title") },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4" />
              {tScope("templatesCardTitle")}
            </CardTitle>
            <CardDescription>{tScope("templatesCardDescription")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/campamentos/plantillas?scope=${templateScope}`}>
              {tScope("templatesCardAction")}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="size-4" />
            {tScope("eventTypesCardTitle")}
          </CardTitle>
          <CardDescription>{tScope("eventTypesCardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <EndpointErrorBanner state="missing" detail={loadError} />
          ) : (
            <PhaseECatalogCrudPage
              title={tCatalog("title")}
              description={tCatalog("description")}
              entityLabel={tCatalog("entityLabel")}
              emptyIcon={<Flag />}
              includeDescription
              idField="event_type_id"
              nameField="name"
              items={items}
              meta={meta}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
              createAction={createCamporeeEventTypeAction}
              updateAction={updateCamporeeEventTypeAction}
              deleteAction={deleteCamporeeEventTypeAction}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
