import { Suspense } from "react";
import dynamic from "next/dynamic";
import { FolderOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FolderClientPage } from "@/components/annual-folders/folder-client-page";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadAnnualFoldersHub,
  parseAnnualFoldersSearchParams,
} from "@/lib/v2/loaders/annual-folders";

const EvaluationClientPage = dynamic(
  () =>
    import("@/components/annual-folders/evaluation-client-page").then((m) => ({
      default: m.EvaluationClientPage,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-9 w-[220px]" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    ),
  },
);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function AnnualFoldersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

async function AnnualFoldersContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("annual_folders.pageFolders");
  const user = await requireAdminUser();
  const { folderId } = parseAnnualFoldersSearchParams(searchParams);
  const result = await loadAnnualFoldersHub(user, folderId);

  if (result.error) {
    const detail = result.error.message || t("loadError");
    return <EndpointErrorBanner state="missing" detail={detail} />;
  }

  if (folderId && !result.folder) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
      />
    );
  }

  if (result.folder) {
    return <FolderClientPage initialFolder={result.folder} />;
  }

  return (
    <EvaluationClientPage
      currentUserRoles={result.currentUserRoles}
      clubTypes={result.clubTypes}
      ecclesiasticalYears={result.ecclesiasticalYears}
      unions={result.unions}
      localFields={result.localFields}
    />
  );
}

export default async function V2AnnualFoldersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const t = await getTranslations("annual_folders.pageFolders");
  const rawParams = await searchParams;
  const { folderId } = parseAnnualFoldersSearchParams(rawParams);

  return (
    <V2PageShell
      title={folderId ? t("titleDetail") : t("titleList")}
      description={folderId ? t("descriptionDetail") : t("descriptionList")}
      bleed
    >
      <Suspense fallback={<AnnualFoldersSkeleton />}>
        <AnnualFoldersContent searchParams={rawParams} />
      </Suspense>
    </V2PageShell>
  );
}
