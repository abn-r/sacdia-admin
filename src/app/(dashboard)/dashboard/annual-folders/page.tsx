import { Building2, FileSearch, FolderOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderClientPage } from "@/components/annual-folders/folder-client-page";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { getFolder, getFolderBySection } from "@/lib/api/annual-folders";
import type { AnnualFolder } from "@/lib/api/annual-folders";
import type { AuthUser } from "@/lib/auth/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ActiveClubFolderContext = {
  roleName: string | null;
  clubName: string | null;
  sectionId: number;
  sectionName: string | null;
  clubTypeName: string | null;
};

function getFolderId(
  raw: Record<string, string | string[] | undefined>,
): string | null {
  const v = raw["folder"];
  const str = typeof v === "string" ? v.trim() : undefined;
  return str ?? null;
}

function getActiveClubFolderContext(
  user: AuthUser,
): ActiveClubFolderContext | null {
  const scope = user.authorization?.effective?.scope;
  if (!scope || typeof scope !== "object") return null;

  const clubScope = (scope as { club?: unknown }).club;
  if (!clubScope || typeof clubScope !== "object") return null;

  const section = (clubScope as { section?: unknown }).section;
  if (!section || typeof section !== "object") return null;

  const rawSectionId = (section as { club_section_id?: unknown })
    .club_section_id;
  if (
    typeof rawSectionId !== "number" ||
    !Number.isFinite(rawSectionId) ||
    rawSectionId <= 0
  ) {
    return null;
  }

  const club = (clubScope as { club?: unknown }).club;
  const roleName = (clubScope as { role_name?: unknown }).role_name;
  const clubName =
    club && typeof club === "object"
      ? (club as { club_name?: unknown }).club_name
      : null;
  const sectionName = (section as { name?: unknown }).name;
  const clubTypeName = (section as { club_type_name?: unknown }).club_type_name;

  return {
    roleName: typeof roleName === "string" ? roleName : null,
    clubName: typeof clubName === "string" ? clubName : null,
    sectionId: rawSectionId,
    sectionName: typeof sectionName === "string" ? sectionName : null,
    clubTypeName: typeof clubTypeName === "string" ? clubTypeName : null,
  };
}

function ActiveClubContextCard({
  context,
}: {
  context: ActiveClubFolderContext;
}) {
  const sectionLabel =
    context.sectionName ?? context.clubTypeName ?? `Sección #${context.sectionId}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Building2 className="mt-0.5 size-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Carpeta de tu asignación activa</p>
          <p className="text-sm text-muted-foreground">
            {context.clubName ?? "Club"} · {sectionLabel}
            {context.roleName ? ` · ${context.roleName}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AnnualFoldersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("annual_folders");

  const rawParams = await searchParams;
  const folderId = getFolderId(rawParams);
  const activeClubContext = getActiveClubFolderContext(user);

  let folder: AnnualFolder | null = null;
  let loadError: string | null = null;

  // Deep links from the evaluation queue may still open a specific folder.
  if (folderId) {
    try {
      folder = await getFolder(folderId);
    } catch (err) {
      loadError =
        err instanceof ApiError ? err.message : t("page.errorFolderFallback");
    }
  } else if (activeClubContext) {
    try {
      folder = await getFolderBySection(activeClubContext.sectionId);
    } catch (err) {
      loadError =
        err instanceof ApiError
          ? err.message
          : t("page.errorEnrollmentFallback");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      {!folderId && activeClubContext && (
        <ActiveClubContextCard context={activeClubContext} />
      )}

      {/* Error state */}
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {/* No active club context */}
      {!loadError && !folder && !folderId && !activeClubContext && (
        <EmptyState
          icon={FileSearch}
          title={t("page.emptyNoActiveClubTitle")}
          description={t("page.emptyNoActiveClubDescription")}
        />
      )}

      {/* Active context without annual folder */}
      {!loadError && !folder && !folderId && activeClubContext && (
        <EmptyState
          icon={FolderOpen}
          title={t("page.emptyContextFolderTitle")}
          description={t("page.emptyContextFolderDescription")}
        />
      )}

      {/* Folder deep link not found */}
      {!loadError && !folder && folderId && (
        <EmptyState
          icon={FolderOpen}
          title={t("page.emptyNotFoundTitle")}
          description={t("page.emptyNotFoundDescription")}
        />
      )}

      {/* Folder view */}
      {!loadError && folder && <FolderClientPage initialFolder={folder} />}
    </div>
  );
}
