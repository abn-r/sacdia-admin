import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { ValidationClientPage } from "@/components/validation/validation-client-page";
import { getPendingValidations, type PendingValidation } from "@/lib/api/validation";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractSections(
  validations: PendingValidation[],
): Array<{ section_id: number; name: string }> {
  const map = new Map<number, string>();
  for (const v of validations) {
    if (v.section) {
      map.set(v.section.section_id, v.section.name);
    }
  }
  return Array.from(map.entries()).map(([section_id, name]) => ({
    section_id,
    name,
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ValidationPage() {
  await requireAdminUser();
  const t = await getTranslations("validation_admin");

  let classValidations: PendingValidation[] = [];
  let honorValidations: PendingValidation[] = [];
  let loadError: string | null = null;

  try {
    const [classResult, honorResult] = await Promise.allSettled([
      getPendingValidations({ entity_type: "class" }),
      getPendingValidations({ entity_type: "honor" }),
    ]);

    if (classResult.status === "fulfilled") {
      classValidations = classResult.value;
    } else {
      const err = classResult.reason;
      loadError =
        err instanceof ApiError
          ? err.message
          : t("page.errorLoadClasses");
    }

    if (honorResult.status === "fulfilled") {
      honorValidations = honorResult.value;
    } else if (!loadError) {
      const err = honorResult.reason;
      loadError =
        err instanceof ApiError
          ? err.message
          : t("page.errorLoadHonors");
    }
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : t("page.errorLoadGeneric");
  }

  const sections = extractSections([...classValidations, ...honorValidations]);
  const totalPending = classValidations.length + honorValidations.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && totalPending === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title={t("page.emptyTitle")}
          description={t("page.emptyDescription")}
        />
      )}

      {!loadError && totalPending > 0 && (
        <ValidationClientPage
          initialClasses={classValidations}
          initialHonors={honorValidations}
          sections={sections}
        />
      )}
    </div>
  );
}
