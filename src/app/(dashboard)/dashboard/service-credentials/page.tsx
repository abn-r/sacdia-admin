import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { ServiceCredentialReviewQueue } from "@/components/service-credentials/service-credential-review-queue";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("service_credentials.page");
  return { title: t("title") };
}

export default async function ServiceCredentialsReviewPage() {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "service-credentials-review")) {
    return <PageAccessForbidden />;
  }

  const t = await getTranslations("service_credentials.page");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <ServiceCredentialReviewQueue />
    </div>
  );
}
