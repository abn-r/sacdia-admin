import Link from "next/link";
import { Tent } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CampoReesView } from "@/components/camporees/camporees-view";
import { ApiError, apiRequest } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import type { Camporee } from "@/lib/api/camporees";

type AnyRecord = Record<string, unknown>;

function extractCamporees(payload: unknown): Camporee[] {
  if (Array.isArray(payload)) return payload as Camporee[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as Camporee[];
    if (root.data && typeof root.data === "object") {
      const nested = root.data as AnyRecord;
      if (Array.isArray(nested.data)) return nested.data as Camporee[];
    }
  }
  return [];
}

export default async function CamporeesPage() {
  await requireAdminUser();
  const t = await getTranslations("camporees.pages.list");

  let camporees: Camporee[] = [];
  let loadError: string | null = null;

  try {
    const payload = await apiRequest<unknown>("/camporees");
    camporees = extractCamporees(payload);
  } catch (err) {
    loadError =
      err instanceof ApiError ? err.message : t("loadFailed");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/camporees/union">{t("viewUnion")}</Link>
        </Button>
      </PageHeader>

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {loadError && (
        <EmptyState
          icon={Tent}
          title={t("emptyTitle")}
          description={loadError}
        />
      )}

      {!loadError && (
        <CampoReesView initialCamporees={camporees} />
      )}
    </div>
  );
}
