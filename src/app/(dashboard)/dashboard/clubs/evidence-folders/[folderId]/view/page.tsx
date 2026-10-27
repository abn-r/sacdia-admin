import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { FolderClientPage } from "@/components/annual-folders/folder-client-page";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { getFolder } from "@/lib/api/annual-folders";
import type { AnnualFolder } from "@/lib/api/annual-folders";
import {
  CLUBS_EVIDENCE_FOLDERS_BASE,
  clubsEvidenceFolderPath,
} from "@/lib/clubs/evidence-folders-paths";

type PageParams = Promise<{ folderId: string }>;

export default async function ClubsEvidenceFolderViewPage({
  params,
}: {
  params: PageParams;
}) {
  await requireAdminUser();
  const { folderId } = await params;
  const t = await getTranslations("annual_folders.pageFolders");

  let folder: AnnualFolder | null = null;
  let loadError: string | null = null;

  try {
    folder = await getFolder(folderId);
  } catch (err) {
    loadError =
      err instanceof ApiError ? err.message : t("loadError");
  }

  const folderClub = folder?.club_enrollment?.club_section?.club?.name;
  const folderSection =
    folder?.club_enrollment?.club_section?.name ??
    folder?.club_enrollment?.club_section?.club_type?.name;
  const folderTitle =
    folderClub && folderSection
      ? `${folderClub} · ${folderSection}`
      : (folderClub ?? t("titleDetail"));

  return (
    <div className="space-y-6">
      <PageHeader
        title={folderTitle}
        description={t("descriptionDetail")}
        breadcrumbs={[
          { label: t("titleList"), href: CLUBS_EVIDENCE_FOLDERS_BASE },
          { label: folderTitle, href: clubsEvidenceFolderPath(folderId) },
          { label: t("titleDetail") },
        ]}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && !folder && (
        <EmptyState
          icon={FolderOpen}
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
        >
          <Button variant="outline" asChild>
            <Link href={CLUBS_EVIDENCE_FOLDERS_BASE}>{t("titleList")}</Link>
          </Button>
        </EmptyState>
      )}

      {!loadError && folder && <FolderClientPage initialFolder={folder} />}
    </div>
  );
}
