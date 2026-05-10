import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { listClubTypes } from "@/lib/api/catalogs";
import { getAwardCategories } from "@/lib/api/annual-folders";
import type { AwardCategory } from "@/lib/api/annual-folders";
import type { ClubType } from "@/lib/api/catalogs";

const AwardCategoriesClientPage = dynamic(
  () =>
    import("@/components/annual-folders/award-categories-client-page").then(
      (m) => ({ default: m.AwardCategoriesClientPage })
    ),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    ),
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AwardCategoriesPage() {
  await requireAdminUser();
  const t = await getTranslations("annual_folders");

  let categories: AwardCategory[] = [];
  let clubTypes: ClubType[] = [];
  let loadError: string | null = null;

  const [categoriesResult, clubTypesResult] = await Promise.allSettled([
    getAwardCategories(undefined, true, "club"),
    listClubTypes(),
  ]);

  if (categoriesResult.status === "fulfilled") {
    categories = Array.isArray(categoriesResult.value)
      ? categoriesResult.value
      : (extractArray(categoriesResult.value) as AwardCategory[]);
  } else {
    const err = categoriesResult.reason;
    loadError =
      err instanceof ApiError
        ? err.message
        : t("pageCategories.errorFallback");
  }

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = Array.isArray(clubTypesResult.value)
      ? clubTypesResult.value
      : (extractArray(clubTypesResult.value) as ClubType[]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageCategories.title")}
        description={t("pageCategories.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && (
        <AwardCategoriesClientPage
          initialCategories={categories}
          clubTypes={clubTypes}
        />
      )}
    </div>
  );
}
