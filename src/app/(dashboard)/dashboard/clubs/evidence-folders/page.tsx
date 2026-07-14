import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { extractRoles } from "@/lib/auth/roles";
import { requireAdminUser } from "@/lib/auth/session";
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

export default async function ClubsEvidenceFoldersPage() {
  const t = await getTranslations("annual_folders.pageFolders");
  const currentUser = await requireAdminUser();

  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];
  let unions: Union[] = [];
  let localFields: LocalField[] = [];
  let loadError: string | null = null;

  const [clubTypesResult, yearsResult, unionsResult, localFieldsResult] =
    await Promise.allSettled([
      listClubTypes(),
      listEcclesiasticalYears(),
      listUnionsForTerritory(currentUser),
      listLocalFieldsForTerritory(currentUser),
    ]);

  if (clubTypesResult.status === "fulfilled") clubTypes = clubTypesResult.value;
  else loadError = t("loadError");

  if (yearsResult.status === "fulfilled") ecclesiasticalYears = yearsResult.value;
  if (unionsResult.status === "fulfilled") unions = unionsResult.value;
  if (localFieldsResult.status === "fulfilled") localFields = localFieldsResult.value;

  return (
    <div className="space-y-6">
      <PageHeader title={t("titleList")} description={t("descriptionList")} />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && (
        <EvaluationClientPage
          mode="list"
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
