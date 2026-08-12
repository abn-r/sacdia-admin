import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CertificationReviewsClient } from "@/components/certifications/certification-reviews-client";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hasPermission } from "@/lib/auth/permission-utils";
import { CERTIFICATIONS_REVIEW } from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("certification_reviews.page");
  return { title: t("title") };
}

export default async function CertificationReviewsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("certification_reviews");

  if (!hasPermission(user, CERTIFICATIONS_REVIEW)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page.title")}
          description={t("page.description")}
        />
        <Alert variant="destructive">
          <AlertTitle>{t("gate.forbiddenTitle")}</AlertTitle>
          <AlertDescription>{t("gate.forbiddenDescription")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />
      <CertificationReviewsClient />
    </div>
  );
}
