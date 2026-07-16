import { Award } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { InvestitureClientPage } from "@/components/investiture/investiture-client-page";
import { ApiError } from "@/lib/api/client";
import { getPendingInvestitures } from "@/lib/api/investiture";
import { listEcclesiasticalYears } from "@/lib/api/catalogs";
import { requireAdminUser } from "@/lib/auth/session";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";
import type { PendingEnrollment } from "@/lib/api/investiture";

type GenericRecord = Record<string, unknown>;

function extractEnrollments(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (Array.isArray(root.data)) return root.data as GenericRecord[];
    const nested = root.data;
    if (
      nested &&
      typeof nested === "object" &&
      Array.isArray((nested as GenericRecord).data)
    ) {
      return (nested as GenericRecord).data as GenericRecord[];
    }
  }
  return [];
}

function extractYears(payload: unknown): EcclesiasticalYear[] {
  if (Array.isArray(payload)) return payload as EcclesiasticalYear[];
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (Array.isArray(root.data)) return root.data as EcclesiasticalYear[];
  }
  return [];
}

export default async function InvestiturePage() {
  await requireAdminUser();
  const t = await getTranslations("investiture");

  let enrollments: PendingEnrollment[] = [];
  let years: EcclesiasticalYear[] = [];
  let loadError: string | null = null;

  try {
    const [pendingPayload, yearsPayload] = await Promise.allSettled([
      getPendingInvestitures({ page: 1, limit: 100 }),
      listEcclesiasticalYears(),
    ]);

    if (pendingPayload.status === "fulfilled") {
      const raw = extractEnrollments(pendingPayload.value);
      enrollments = raw as PendingEnrollment[];
    } else {
      const err = pendingPayload.reason;
      loadError =
        err instanceof ApiError
          ? err.message
          : t("page.errorFallback");
    }

    if (yearsPayload.status === "fulfilled") {
      years = extractYears(yearsPayload.value);
    }
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : t("page.errorFallback");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && enrollments.length === 0 && (
        <EmptyState
          icon={Award}
          title={t("page.emptyTitle")}
          description={t("page.emptyDescription")}
        />
      )}

      {!loadError && enrollments.length > 0 && (
        <InvestitureClientPage
          initialEnrollments={enrollments}
          years={years}
        />
      )}
    </div>
  );
}
