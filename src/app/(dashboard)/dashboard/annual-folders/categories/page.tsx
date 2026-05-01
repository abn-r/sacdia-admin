import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AwardCategoriesClientPage } from "@/components/annual-folders/award-categories-client-page";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { listClubTypes } from "@/lib/api/catalogs";
import { getAwardCategories } from "@/lib/api/annual-folders";
import type { AwardCategory } from "@/lib/api/annual-folders";
import type { ClubType } from "@/lib/api/catalogs";

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
        : "No se pudieron cargar las categorías de premio.";
  }

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = Array.isArray(clubTypesResult.value)
      ? clubTypesResult.value
      : (extractArray(clubTypesResult.value) as ClubType[]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías de premios"
        description="Gestión de categorías de premio por alcance: Club, Sección y Miembro."
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
