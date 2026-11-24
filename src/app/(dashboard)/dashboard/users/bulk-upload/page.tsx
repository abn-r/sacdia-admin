import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { BulkUploadClient } from "@/components/users/bulk-upload-client";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";
import { errorStateFromError } from "@/lib/api/error-state";
import { loadBulkUploadData } from "@/lib/users/bulk-upload-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users.pages.bulk");
  return { title: t("title") };
}

export default async function BulkUploadPage() {
  const currentUser = await requireAdminUser();

  // Page gate = `users.bulk_create` capability (users:bulk_create AND @GlobalRoles), as the API.
  if (!canCapability(currentUser, "users", "bulk_create")) {
    notFound();
  }

  const t = await getTranslations("users.pages.bulk");
  const tList = await getTranslations("users.pages.list");
  const tNew = await getTranslations("people.users.bulk");
  // The review resolves names against the catalogs; without them it cannot run.
  const loaded = await loadBulkUploadData(currentUser);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={tNew("description")}
        breadcrumbs={[
          { label: tList("title"), href: "/dashboard/users" },
          { label: t("breadcrumb") },
        ]}
      />

      {loaded.ok ? (
        <BulkUploadClient {...loaded.data} />
      ) : (
        <ErrorState
          retry
          {...errorStateFromError(loaded.error)}
          title={tNew("catalogsError.title")}
          description={tNew("catalogsError.description")}
        />
      )}
    </div>
  );
}
