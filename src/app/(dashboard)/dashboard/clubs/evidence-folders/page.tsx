import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { EvidenceFolderQueue } from "@/components/annual-folders/evidence-folder-queue";
import { requireAdminUser } from "@/lib/auth/session";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { listTemplates, type FolderTemplate } from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  listAnnualRankingConfigs,
  type AnnualRankingConfig,
} from "@/lib/api/annual-rankings";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
} from "@/lib/auth/territory-scope";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";

function isForbidden(reason: unknown): boolean {
  return reason instanceof ApiError && reason.status === 403;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("annual_folders.pageFolders");
  return { title: t("titleList") };
}

export default async function ClubsEvidenceFoldersPage() {
  const t = await getTranslations("annual_folders.pageFolders");
  const currentUser = await requireAdminUser();

  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];
  let unions: Union[] = [];
  let localFields: LocalField[] = [];
  let templates: FolderTemplate[] = [];
  let rankingConfigs: AnnualRankingConfig[] = [];
  let loadFailure: unknown = null;

  const [
    clubTypesResult,
    yearsResult,
    unionsResult,
    localFieldsResult,
    templatesResult,
    rankingConfigsResult,
  ] = await Promise.allSettled([
    listClubTypes(),
    listEcclesiasticalYears(),
    listUnionsForTerritory(currentUser),
    listLocalFieldsForTerritory(currentUser),
    listTemplates(),
    listAnnualRankingConfigs(),
  ]);

  // Club types and years feed the filters and the setup check: without them
  // the screen cannot tell "nothing to review" from "not loaded".
  if (clubTypesResult.status === "fulfilled") clubTypes = clubTypesResult.value;
  else loadFailure = clubTypesResult.reason;

  if (yearsResult.status === "fulfilled") ecclesiasticalYears = yearsResult.value;
  else loadFailure = loadFailure ?? yearsResult.reason;

  // Territory filters are optional: without them the queue still works.
  if (unionsResult.status === "fulfilled") unions = unionsResult.value;
  if (localFieldsResult.status === "fulfilled") localFields = localFieldsResult.value;

  // Templates and ranking configs only feed the setup notice. A reader without
  // annual_folder_templates:read (coordinators) gets 403 and still sees the
  // folders; any other failure stays a load error.
  if (templatesResult.status === "fulfilled") templates = templatesResult.value;
  else if (!isForbidden(templatesResult.reason)) {
    loadFailure = loadFailure ?? templatesResult.reason;
  }

  if (rankingConfigsResult.status === "fulfilled") {
    rankingConfigs = rankingConfigsResult.value;
  } else if (!isForbidden(rankingConfigsResult.reason)) {
    loadFailure = loadFailure ?? rankingConfigsResult.reason;
  }

  if (loadFailure) {
    const failure = errorStateFromError(loadFailure);
    return (
      <div className="space-y-6">
        <PageHeader title={t("titleList")} />
        <ErrorState
          kind={failure.kind}
          retry
          {...(failure.detail ? { detail: failure.detail } : {})}
        />
      </div>
    );
  }

  return (
    <EvidenceFolderQueue
      clubTypes={clubTypes}
      ecclesiasticalYears={ecclesiasticalYears}
      unions={unions}
      localFields={localFields}
      templates={templates}
      rankingConfigs={rankingConfigs}
    />
  );
}
