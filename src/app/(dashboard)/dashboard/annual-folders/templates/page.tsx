import { FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { TemplatesClientPage } from "@/components/annual-folders/templates-client-page";
import { requireAdminUser } from "@/lib/auth/session";
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
        : "No se pudieron cargar las plantillas.";
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
        title="Plantillas de carpeta anual"
        description="Define la estructura de secciones para cada tipo de club y año eclesiástico."
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
