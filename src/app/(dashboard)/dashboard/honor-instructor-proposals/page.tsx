import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HonorInstructorProposalsQueue } from "@/components/honor-instructor-proposals/honor-instructor-proposals-queue";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("honor_instructor_proposals.page");
  return { title: t("title") };
}

export default async function HonorInstructorProposalsPage() {
  const user = await requireAdminUser();

  if (!canViewScreen(user, "honor-instructor-proposals")) {
    return <PageAccessForbidden />;
  }

  const t = await getTranslations("honor_instructor_proposals.page");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <HonorInstructorProposalsQueue />
    </div>
  );
}
