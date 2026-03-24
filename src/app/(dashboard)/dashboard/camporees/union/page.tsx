import { Tent } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { UnionCampoReesView } from "@/components/camporees/union-camporees-view";
import { ApiError, apiRequest } from "@/lib/api/client";
import { listUnions, type Union } from "@/lib/api/geography";
import { requireAdminUser } from "@/lib/auth/session";
import type { UnionCamporee } from "@/lib/api/camporees";

type AnyRecord = Record<string, unknown>;

function extractCamporees(payload: unknown): UnionCamporee[] {
  if (Array.isArray(payload)) return payload as UnionCamporee[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as UnionCamporee[];
    if (root.data && typeof root.data === "object") {
      const nested = root.data as AnyRecord;
      if (Array.isArray(nested.data)) return nested.data as UnionCamporee[];
    }
  }
  return [];
}

export default async function UnionCamporeesPage() {
  await requireAdminUser();

  let camporees: UnionCamporee[] = [];
  let unions: Union[] = [];
  let loadError: string | null = null;

  try {
    const [camporeesPayload, unionsPayload] = await Promise.allSettled([
      apiRequest<unknown>("/camporees/union"),
      listUnions(),
    ]);

    if (camporeesPayload.status === "fulfilled") {
      camporees = extractCamporees(camporeesPayload.value);
    } else {
      loadError =
        camporeesPayload.reason instanceof ApiError
          ? camporeesPayload.reason.message
          : "No se pudo cargar la lista de camporees de unión.";
    }

    if (unionsPayload.status === "fulfilled") {
      unions = Array.isArray(unionsPayload.value) ? unionsPayload.value : [];
    }
  } catch (err) {
    loadError =
      err instanceof ApiError ? err.message : "No se pudo cargar la página.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Camporees de Unión"
        description="Gestión de camporees a nivel de unión."
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {loadError && (
        <EmptyState
          icon={Tent}
          title="No se pudieron cargar los camporees de unión"
          description={loadError}
        />
      )}

      {!loadError && (
        <UnionCampoReesView initialCamporees={camporees} unions={unions} />
      )}
    </div>
  );
}
