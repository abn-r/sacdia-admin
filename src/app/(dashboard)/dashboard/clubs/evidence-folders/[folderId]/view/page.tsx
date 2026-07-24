import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={clubsEvidenceFolderPath(folderId)}>
            <ChevronLeft className="size-4" />
            {t("titleDetail")}
          </Link>
        </Button>

        <PageHeader
          title={t("titleDetail")}
          description={t("descriptionDetail")}
        />
      </div>

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
