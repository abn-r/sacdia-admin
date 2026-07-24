import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ClubsValidationsClient } from "@/components/clubs/validations/clubs-validations-client";
import type { ClubsValidationTab } from "@/components/clubs/validations/clubs-validations-client";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { getPendingCertificateBulkImports } from "@/lib/api/certificate-bulk-imports";
import { getEvidencePending } from "@/lib/api/evidence-review";
import { getPendingValidations } from "@/lib/api/validation";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const VALID_TABS: ClubsValidationTab[] = [
  "honors",
  "modules",
  "sections",
  "certificates",
];

function readTab(raw: Record<string, string | string[] | undefined>): ClubsValidationTab {
  const value = raw.tab;
  const tab = Array.isArray(value) ? value[0] : value;
  if (tab && VALID_TABS.includes(tab as ClubsValidationTab)) {
    return tab as ClubsValidationTab;
  }
  return "honors";
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clubs.pages.validations");
  return { title: t("title") };
}

export default async function ClubsValidationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const t = await getTranslations("clubs.pages.validations");
  const raw = await searchParams;
  const defaultTab = readTab(raw);

  let loadError: string | null = null;
  let honors: Awaited<ReturnType<typeof getPendingValidations>> = [];
  let modules: Awaited<ReturnType<typeof getPendingValidations>> = [];
  let honorEvidence: Awaited<ReturnType<typeof getEvidencePending>>["data"] = [];
  let sectionEvidence: Awaited<ReturnType<typeof getEvidencePending>>["data"] = [];
  let certificateBatches: Awaited<
    ReturnType<typeof getPendingCertificateBulkImports>
  >["items"] = [];
  let certificateTotal = 0;

  try {
    const [
      honorsResult,
      modulesResult,
      honorEvidenceResult,
      sectionEvidenceResult,
      certificatesResult,
    ] = await Promise.allSettled([
      getPendingValidations({ entity_type: "honor" }),
      getPendingValidations({ entity_type: "class" }),
      getEvidencePending("honor", 1, 200),
      getEvidencePending("class", 1, 200),
      getPendingCertificateBulkImports({ page: 1, limit: 100 }),
    ]);

    if (honorsResult.status === "fulfilled") {
      honors = honorsResult.value;
    } else if (!loadError) {
      loadError =
        honorsResult.reason instanceof ApiError
          ? honorsResult.reason.message
          : t("errors.honors");
    }

    if (modulesResult.status === "fulfilled") {
      modules = modulesResult.value;
    } else if (!loadError) {
      loadError =
        modulesResult.reason instanceof ApiError
          ? modulesResult.reason.message
          : t("errors.modules");
    }

    if (honorEvidenceResult.status === "fulfilled") {
      honorEvidence = honorEvidenceResult.value.data;
    }

    if (sectionEvidenceResult.status === "fulfilled") {
      sectionEvidence = sectionEvidenceResult.value.data;
    }

    if (certificatesResult.status === "fulfilled") {
      certificateBatches = certificatesResult.value.items;
      certificateTotal = certificatesResult.value.total;
    }
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : t("errors.generic");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && (
        <Suspense fallback={null}>
          <ClubsValidationsClient
            initialHonors={honors}
            initialModules={modules}
            initialHonorEvidence={honorEvidence}
            initialSectionEvidence={sectionEvidence}
            certificateBatches={certificateBatches}
            certificateTotal={certificateTotal}
            defaultTab={defaultTab}
          />
        </Suspense>
      )}
    </div>
  );
}
