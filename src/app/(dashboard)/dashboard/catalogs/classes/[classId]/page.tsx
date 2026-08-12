import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ClassModuleTree } from "@/components/classes/class-module-tree";
import { ClassHonorsDialog, type ClassHonorOption } from "@/components/classes/class-honors-dialog";
import {
  ClassPrerequisitesDialog,
  type ClassPrerequisiteOption,
} from "@/components/classes/class-prerequisites-dialog";
import { ApiError } from "@/lib/api/client";
import { getClassById } from "@/lib/api/classes";
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
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { CATALOGS_CREATE, CATALOGS_DELETE, CLASSES_MANAGE } from "@/lib/auth/permissions";

type Params = Promise<{ classId: string }>;

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

export default async function CatalogClassDetailPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const t = await getTranslations("classes.pages.detail");
  const statusT = await getTranslations("classes.status");
  const catalogT = await getTranslations("catalogs.pages.classes");

  const { classId: classIdParam } = await params;
  const classId = toPositiveNumber(classIdParam);
  if (!classId) notFound();

  const canManageRelations = hasAnyPermission(user, [CLASSES_MANAGE, CATALOGS_CREATE]);
  const canDeleteRelations = hasAnyPermission(user, [CLASSES_MANAGE, CATALOGS_DELETE]);

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
  let loadError: string | null = null;

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
    loadError = error instanceof ApiError ? error.message : catalogT("loadError");
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={className}
        description={t("description")}
        breadcrumbs={[
          { label: catalogT("title"), href: "/dashboard/catalogs/classes" },
          { label: className },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/catalogs/classes">
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{className}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{clubTypeName}</Badge>
            <Badge variant={isActive ? "default" : "outline"}>
              {isActive ? statusT("active") : statusT("inactive")}
            </Badge>
            <ClassHonorsDialog
              classId={classId}
              initialRelations={honorRelations}
              honorsCatalog={honorOptions}
              canCreate={canManageRelations}
              canDelete={canDeleteRelations}
            />
            <ClassPrerequisitesDialog
              classId={classId}
              initialPrerequisites={prerequisiteRelations}
              classOptions={classOptions}
              canCreate={canManageRelations}
              canDelete={canDeleteRelations}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("structureCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <EndpointErrorBanner state="missing" detail={loadError} />
          ) : (
            <ClassModuleTree modules={modules} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
