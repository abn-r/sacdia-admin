import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FoldersManagementClient } from "@/components/folders/folders-management-client";
import { requireAdminUser } from "@/lib/auth/session";
import { fetchFolders, extractFolders } from "@/lib/api/folders";
import { ApiError } from "@/lib/api/client";
import type { FolderTemplate } from "@/lib/api/folders";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function FoldersPage() {
  await requireAdminUser();
  const t = await getTranslations("folders");

  let folders: FolderTemplate[] = [];
  let loadError: string | null = null;

  try {
    const payload = await fetchFolders();
    folders = extractFolders(payload);
  } catch (err) {
    loadError =
      err instanceof ApiError
        ? err.message
        : t("page.errorLoad");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {/* FoldersManagementClient handles its own empty state with a create button */}
      {!loadError && (
        <FoldersManagementClient initialFolders={folders} />
      )}
    </div>
  );
}
