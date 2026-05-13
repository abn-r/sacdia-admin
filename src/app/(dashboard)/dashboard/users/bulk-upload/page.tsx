import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { BulkUploadClient } from "@/components/users/bulk-upload-client";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles } from "@/lib/auth/roles";

// Same set as /users/new — same permission gate
const ALLOWED_PAGE_ROLES = new Set([
  "super-admin",
  "admin",
  "director-dia",
  "assistant-dia",
  "director-union",
  "assistant-union",
  "director-lf",
  "assistant-lf",
]);

export default async function BulkUploadPage() {
  const currentUser = await requireAdminUser();
  const userRoles = extractRoles(currentUser);

  const hasAccess = userRoles.some((r) => ALLOWED_PAGE_ROLES.has(r));
  if (!hasAccess) {
    notFound();
  }

  const t = await getTranslations("users.pages.bulk");
  const tList = await getTranslations("users.pages.list");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: tList("title"), href: "/dashboard/users" },
          { label: t("breadcrumb") },
        ]}
      />

      <BulkUploadClient />
    </div>
  );
}
