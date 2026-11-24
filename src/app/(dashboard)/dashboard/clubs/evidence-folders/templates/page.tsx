import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { TemplatesClientPage } from "@/components/annual-folders/templates-client-page";
import { requireAdminUser } from "@/lib/auth/session";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { LocalField, Union } from "@/lib/api/geography";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { listTemplates, type FolderTemplate } from "@/lib/api/annual-folders";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  listAnnualRankingConfigs,
  type AnnualRankingConfig,
} from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("annual_folders");
  return { title: t("pageTemplates.title") };
}

export default async function ClubsEvidenceFolderTemplatesPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("annual_folders");
  const territoryScope = resolveAdminTerritoryScope(user);

  let templates: FolderTemplate[] = [];
  let rankingConfigs: AnnualRankingConfig[] = [];
  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];
  let unions: Union[] = [];
  let localFields: LocalField[] = [];
  let loadFailure: unknown = null;

  const [
    templatesResult,
    rankingConfigsResult,
    clubTypesResult,
    yearsResult,
    unionsResult,
    localFieldsResult,
  ] = await Promise.allSettled([
    listTemplates(),
    listAnnualRankingConfigs(),
    listClubTypes(),
    listEcclesiasticalYears(),
    listUnionsForTerritory(user),
    listLocalFieldsForTerritory(user),
  ]);

  if (templatesResult.status === "fulfilled") templates = templatesResult.value;
  else loadFailure = templatesResult.reason;

  if (rankingConfigsResult.status === "fulfilled") {
    rankingConfigs = rankingConfigsResult.value;
  } else {
    loadFailure = loadFailure ?? rankingConfigsResult.reason;
  }

  if (clubTypesResult.status === "fulfilled") clubTypes = clubTypesResult.value;
  if (yearsResult.status === "fulfilled") ecclesiasticalYears = yearsResult.value;

  if (unionsResult.status === "fulfilled") unions = unionsResult.value;
  else loadFailure = loadFailure ?? unionsResult.reason;

  if (localFieldsResult.status === "fulfilled") localFields = localFieldsResult.value;
  else loadFailure = loadFailure ?? localFieldsResult.reason;

  if (loadFailure) {
    const failure = errorStateFromError(loadFailure);
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("pageTemplates.title")}
          description={t("pageTemplates.description")}
        />
        <ErrorState
          kind={failure.kind}
          retry
          {...(failure.detail ? { detail: failure.detail } : {})}
        />
      </div>
    );
  }

  return (
    <TemplatesClientPage
      initialTemplates={templates}
      rankingConfigs={rankingConfigs}
      clubTypes={clubTypes}
      ecclesiasticalYears={ecclesiasticalYears}
      unions={unions}
      localFields={localFields}
      territoryScope={territoryScope}
    />
  );
}
