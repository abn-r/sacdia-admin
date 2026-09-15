import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { BulkUploadClient } from "@/components/users/bulk-upload-client";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";

export default async function BulkUploadPage() {
  const currentUser = await requireAdminUser();

  // Page gate = `users.bulk_create` capability (users:bulk_create AND @GlobalRoles), as the API.
  if (!canCapability(currentUser, "users", "bulk_create")) {
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
