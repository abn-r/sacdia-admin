import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CertificationReviewsClient } from "@/components/certifications/certification-reviews-client";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("certification_reviews.page");
  return { title: t("title") };
}

export default async function CertificationReviewsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("certification_reviews");

  if (!canViewScreen(user, "certifications-reviews")) {
    return <PageAccessForbidden />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />
      <CertificationReviewsClient />
    </div>
  );
}
