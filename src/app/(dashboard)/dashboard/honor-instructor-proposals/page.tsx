import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

/**
 * The queue now lives as a tab of "Especialidades y clases". Users who can open
 * that page are sent there; users who only hold the proposals capability keep
 * this standalone page (same component), so they are never locked out.
 */
export default async function HonorInstructorProposalsPage() {
  const user = await requireAdminUser();

  if (!canViewScreen(user, "honor-instructor-proposals")) {
    return <PageAccessForbidden />;
  }

  if (canViewScreen(user, "validations-investitures")) {
    redirect("/dashboard/clubs/validations?tab=instructors");
  }

  const t = await getTranslations("honor_instructor_proposals.page");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <HonorInstructorProposalsQueue />
    </div>
  );
}
