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
import { ApiError } from "@/lib/api/client";
import { getClassById } from "@/lib/api/classes";
import { listClubTypes } from "@/lib/api/catalogs";
import {
  extractClassDetailRoot,
  extractClassModulesFromDetail,
  sortClassStructureModules,
} from "@/lib/catalogs/classes/class-structure";
import { requireAdminUser } from "@/lib/auth/session";

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
  await requireAdminUser();
  const t = await getTranslations("classes.pages.detail");
  const statusT = await getTranslations("classes.status");
  const catalogT = await getTranslations("catalogs.pages.classes");

  const { classId: classIdParam } = await params;
  const classId = toPositiveNumber(classIdParam);
  if (!classId) notFound();

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
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{clubTypeName}</Badge>
            <Badge variant={isActive ? "default" : "outline"}>
              {isActive ? statusT("active") : statusT("inactive")}
            </Badge>
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
