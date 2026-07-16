import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CertificationModulesTree } from "@/components/certifications/certification-modules-tree";
import { ApiError } from "@/lib/api/client";
import { getCertificationById } from "@/lib/api/certifications";
import {
  extractCertificationDetailRoot,
  normalizeCertificationDetailModules,
  toPositiveNumber,
  toText,
} from "@/lib/certifications/catalog-normalize";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ certificationId: string }>;

export default async function CatalogCertificationDetailPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminUser();
  const t = await getTranslations("catalogs.pages.certificationCatalog");

  const { certificationId: certificationIdParam } = await params;
  const certificationId = toPositiveNumber(certificationIdParam);
  if (!certificationId) notFound();

  let name = `Certificación #${certificationId}`;
  let description: string | null = null;
  let isActive = true;
  let modules = normalizeCertificationDetailModules(null);
  let loadError: string | null = null;

  try {
    const payload = await getCertificationById(certificationId);
    const root = extractCertificationDetailRoot(payload);
    if (!root) notFound();

    name = toText(root.name) ?? name;
    description = toText(root.description);
    isActive = root.active !== false;
    modules = normalizeCertificationDetailModules(payload);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    loadError = error instanceof ApiError ? error.message : t("loadError");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        description={t("detailDescription")}
        breadcrumbs={[
          { label: t("title"), href: "/dashboard/catalogs/certifications" },
          { label: name },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/catalogs/certifications">
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{name}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Badge variant={isActive ? "default" : "outline"}>
            {isActive ? t("statusActive") : t("statusInactive")}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("structureTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <EndpointErrorBanner state="missing" detail={loadError} />
          ) : (
            <CertificationModulesTree modules={modules} />
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("eligibilityNote")}</p>
    </div>
  );
}
