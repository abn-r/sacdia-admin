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

  let folders: FolderTemplate[] = [];
  let loadError: string | null = null;

  try {
    const payload = await fetchFolders();
    folders = extractFolders(payload);
  } catch (err) {
    loadError =
      err instanceof ApiError
        ? err.message
        : "No se pudieron cargar las carpetas de evidencias.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carpetas de Evidencias"
        description="Administra las plantillas de carpetas de evidencias disponibles para los clubes."
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
