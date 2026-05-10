import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminUser } from "@/lib/auth/session";

const TemplatesClientPage = dynamic(
  () =>
    import("@/components/annual-folders/templates-client-page").then((m) => ({
      default: m.TemplatesClientPage,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="rounded-xl border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-4 last:border-0">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
);
import { ApiError, apiRequest } from "@/lib/api/client";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import type { FolderTemplate } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Normalizers ───────────────────────────────────────────────────────────────

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

export default async function TemplatesPage() {
  await requireAdminUser();
  const t = await getTranslations("annual_folders");

  let templates: FolderTemplate[] = [];
  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];
  let loadError: string | null = null;

  const [templatesResult, clubTypesResult, yearsResult] = await Promise.allSettled([
    apiRequest<unknown>("/annual-folders/templates"),
    listClubTypes(),
    listEcclesiasticalYears(),
  ]);

  if (templatesResult.status === "fulfilled") {
    templates = extractArray(templatesResult.value) as FolderTemplate[];
  } else {
    const err = templatesResult.reason;
    loadError =
      err instanceof ApiError
        ? err.message
        : t("pageTemplates.errorFallback");
  }

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = Array.isArray(clubTypesResult.value)
      ? clubTypesResult.value
      : extractArray(clubTypesResult.value) as ClubType[];
  }

  if (yearsResult.status === "fulfilled") {
    ecclesiasticalYears = Array.isArray(yearsResult.value)
      ? yearsResult.value
      : extractArray(yearsResult.value) as EcclesiasticalYear[];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTemplates.title")}
        description={t("pageTemplates.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && (
        <TemplatesClientPage
          initialTemplates={templates}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
        />
      )}
    </div>
  );
}
