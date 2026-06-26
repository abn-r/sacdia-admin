import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";
import { FolderClientPage } from "@/components/annual-folders/folder-client-page";
import { extractRoles } from "@/lib/auth/roles";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { getFolder } from "@/lib/api/annual-folders";
import type { AnnualFolder } from "@/lib/api/annual-folders";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
} from "@/lib/auth/territory-scope";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";

const EvaluationClientPage = dynamic(
  () =>
    import("@/components/annual-folders/evaluation-client-page").then((m) => ({
      default: m.EvaluationClientPage,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-[220px]" />
          <Skeleton className="h-9 w-[140px]" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-[120px]" />
          </div>
        </div>
        <div className="rounded-md border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b p-4 last:border-b-0"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="ml-auto h-8 w-28 rounded" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getFolderId(
  raw: Record<string, string | string[] | undefined>,
): string | null {
  const value = raw.folder;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function AnnualFoldersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("annual_folders.pageFolders");
  const currentUser = await requireAdminUser();
  const rawParams = await searchParams;
  const folderId = getFolderId(rawParams);

  let folder: AnnualFolder | null = null;
  let loadError: string | null = null;
  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];
  let unions: Union[] = [];
  let localFields: LocalField[] = [];

  if (!folderId) {
    const [clubTypesResult, yearsResult, unionsResult, localFieldsResult] =
      await Promise.allSettled([
        listClubTypes(),
        listEcclesiasticalYears(),
        listUnionsForTerritory(currentUser),
        listLocalFieldsForTerritory(currentUser),
      ]);

    if (clubTypesResult.status === "fulfilled") clubTypes = clubTypesResult.value;
    if (yearsResult.status === "fulfilled") ecclesiasticalYears = yearsResult.value;
    if (unionsResult.status === "fulfilled") unions = unionsResult.value;
    if (localFieldsResult.status === "fulfilled") localFields = localFieldsResult.value;
  }

  if (folderId) {
    try {
      folder = await getFolder(folderId);
    } catch (err) {
      loadError =
        err instanceof ApiError
          ? err.message
          : t("loadError");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={folderId ? t("titleDetail") : t("titleList")}
        description={
          folderId ? t("descriptionDetail") : t("descriptionList")
        }
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && folderId && !folder && (
        <EmptyState
          icon={FolderOpen}
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
        />
      )}

      {!loadError && folder && <FolderClientPage initialFolder={folder} />}

      {!folderId && (
        <EvaluationClientPage
          currentUserRoles={extractRoles(currentUser)}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
          unions={unions}
          localFields={localFields}
        />
      )}
    </div>
  );
}
