import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CatalogPageHeader } from "@/components/catalogs/catalog-page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { CertificationsList } from "@/components/certifications/certifications-list";
import { CertificationsAdminPanel } from "@/components/certifications/certifications-admin-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { listCertifications } from "@/lib/api/certifications";
import {
  extractCertificationItems,
  normalizeCertificationListItem,
} from "@/lib/certifications/catalog-normalize";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.certificationCatalog");
  return { title: t("title") };
}

export default async function CatalogCertificationsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs.pages.certificationCatalog");
  const canConfigure = canCapability(user, "catalogs-certifications", "configure");
  const canPublish = canCapability(user, "catalogs-certifications", "publish");

  let items: ReturnType<typeof normalizeCertificationListItem>[] = [];
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    const payload = await listCertifications({ page: 1, limit: 100 });
    items = extractCertificationItems(payload).map(normalizeCertificationListItem);
  } catch (error) {
    loadFailure = catalogLoadFailure(error);
  }

  return (
    <div className="space-y-6">
      <CatalogPageHeader title={t("title")} description={t("description")} />

      {canConfigure ? (
        loadFailure ? null : <CertificationsAdminPanel
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

      {loadFailure ? (
        <ErrorState
          kind={loadFailure.kind}
          retry
          {...(loadFailure.detail ? { detail: loadFailure.detail } : {})}
        />
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
