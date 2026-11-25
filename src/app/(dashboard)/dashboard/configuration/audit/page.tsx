import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogsViewer } from "@/components/audit/audit-logs-viewer";
import { requireAdminUser } from "@/lib/auth/session";
import { canViewScreen } from "@/lib/auth/screen-catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.audit");
  return { title: t("title") };
}

export default async function ConfigurationAuditPage() {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "admin-system-audit")) {
    redirect("/dashboard");
  }

  const t = await getTranslations("admin.audit");

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} description={t("description")} />
      {/* The viewer reads its filters from the URL (useSearchParams). */}
      <Suspense fallback={null}>
        <AuditLogsViewer />
      </Suspense>
    </div>
  );
}
