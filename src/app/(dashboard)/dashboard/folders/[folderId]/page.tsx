import { notFound } from "next/navigation";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FolderDetailClient } from "@/components/folders/folder-detail-client";
import { requireAdminUser } from "@/lib/auth/session";
import { fetchFolder } from "@/lib/api/folders";
import { ApiError } from "@/lib/api/client";
import type { FolderTemplate } from "@/lib/api/folders";

// ─── Page ──────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ folderId: string }>;
};

export default async function FolderDetailPage({ params }: Props) {
  await requireAdminUser();

  const { folderId } = await params;

  let folder: FolderTemplate | null = null;
  let loadError: string | null = null;

  try {
    folder = await fetchFolder(folderId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    loadError =
      err instanceof ApiError
        ? err.message
        : "No se pudo cargar la carpeta de evidencias.";
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <EndpointErrorBanner state="missing" detail={loadError} />
      </div>
    );
  }

  if (!folder) {
    notFound();
  }

  return <FolderDetailClient initialFolder={folder} />;
}
