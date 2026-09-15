import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { CertificationsList } from "@/components/certifications/certifications-list";
import { CertificationsAdminPanel } from "@/components/certifications/certifications-admin-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import { listCertifications } from "@/lib/api/certifications";
import {
  extractCertificationItems,
  normalizeCertificationListItem,
} from "@/lib/certifications/catalog-normalize";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";

export default async function CatalogCertificationsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs.pages.certificationCatalog");
  const canConfigure = canCapability(user, "catalogs-certifications", "configure");
  const canPublish = canCapability(user, "catalogs-certifications", "publish");

  let items: ReturnType<typeof normalizeCertificationListItem>[] = [];
  let loadError: string | null = null;

  try {
    const payload = await listCertifications({ page: 1, limit: 100 });
    items = extractCertificationItems(payload).map(normalizeCertificationListItem);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadError");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {canConfigure ? (
        <CertificationsAdminPanel
          certifications={items.map((item) => ({
            certification_id: item.certification_id,
            name: item.name,
            description: item.description,
          }))}
          canConfigure={canConfigure}
          canPublish={canPublish}
        />
      ) : (
        <Alert>
          <AlertTitle>{t("crudPendingTitle")}</AlertTitle>
          <AlertDescription>{t("crudPendingDescription")}</AlertDescription>
        </Alert>
      )}

      {loadError ? (
        <EndpointErrorBanner state="missing" detail={loadError} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <CertificationsList
          items={items}
          detailBasePath="/dashboard/catalogs/certifications"
        />
      )}
    </div>
  );
}
