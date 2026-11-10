import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { RoleRequirementsPanel } from "@/components/role-requirements/role-requirements-panel";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("role_requirements.page");
  return { title: t("title") };
}

export default async function RoleRequirementsPage() {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "role-requirements")) {
    return <PageAccessForbidden />;
  }

  const t = await getTranslations("role_requirements.page");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <RoleRequirementsPanel />
    </div>
  );
}
