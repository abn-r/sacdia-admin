import { FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderClientPage } from "@/components/annual-folders/folder-client-page";
import { FolderByEnrollmentView } from "@/components/annual-folders/folder-by-enrollment-view";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import {
  getFolderByEnrollment,
  getFolder,
} from "@/lib/api/annual-folders";
import type { AnnualFolder } from "@/lib/api/annual-folders";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getEnrollmentId(
  raw: Record<string, string | string[] | undefined>,
): string | null {
  const v = raw["enrollment"];
  const str = typeof v === "string" ? v.trim() : undefined;
  return str ?? null;
}

function getFolderId(
  raw: Record<string, string | string[] | undefined>,
): string | null {
  const v = raw["folder"];
  const str = typeof v === "string" ? v.trim() : undefined;
  return str ?? null;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AnnualFoldersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();

  const rawParams = await searchParams;
  const enrollmentId = getEnrollmentId(rawParams);
  const folderId = getFolderId(rawParams);

  let folder: AnnualFolder | null = null;
  let loadError: string | null = null;

  // Load folder when enrollment or folder ID is provided
  if (folderId) {
    try {
      folder = await getFolder(folderId);
    } catch (err) {
      loadError =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar la carpeta.";
    }
  } else if (enrollmentId) {
    try {
      folder = await getFolderByEnrollment(enrollmentId);
    } catch (err) {
      loadError =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar la carpeta para esa inscripción.";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carpeta anual"
        description="Gestiona evidencias por sección de la carpeta anual del miembro."
      />

      {/* Search / selector — always visible */}
      <FolderByEnrollmentView
        currentEnrollmentId={enrollmentId}
        currentFolderId={folder?.folder_id ?? null}
      />

      {/* Error state */}
      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {/* Empty / no selection state */}
      {!loadError && !folder && !enrollmentId && !folderId && (
        <EmptyState
          icon={FolderOpen}
          title="Selecciona una inscripción"
          description="Ingresa el ID de inscripción o de carpeta para cargar las evidencias del miembro."
        />
      )}

      {/* Folder not found */}
      {!loadError && !folder && (enrollmentId ?? folderId) && (
        <EmptyState
          icon={FolderOpen}
          title="Carpeta no encontrada"
          description="No existe una carpeta anual para el identificador ingresado. Verifica los datos e intentá de nuevo."
        />
      )}

      {/* Folder view */}
      {!loadError && folder && <FolderClientPage initialFolder={folder} />}
    </div>
  );
}
