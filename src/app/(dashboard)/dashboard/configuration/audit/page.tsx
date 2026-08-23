import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogsViewer } from "@/components/audit/audit-logs-viewer";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";

export default async function ConfigurationAuditPage() {
  const user = await requireAdminUser();
  const isSuperAdmin = extractRoles(user).includes(SUPER_ADMIN_ROLE);
  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  const t = await getTranslations("audit.logs");
  const tNav = await getTranslations("nav.items");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: tNav("configuration"), href: "/dashboard/configuration" },
          { label: t("title") },
        ]}
      />
      <AuditLogsViewer />
    </div>
  );
}
