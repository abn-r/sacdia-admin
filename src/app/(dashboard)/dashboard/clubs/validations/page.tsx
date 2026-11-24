import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClassesQueueClient } from "@/components/clubs/validations/classes-queue-client";
import { settle } from "@/components/clubs/validations/loaded";
import {
  availableClassesTabs,
  legacyEvidenceType,
  resolveClassesTab,
  resolveEvidenceTypeFilter,
} from "@/components/clubs/validations/validation-tabs";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { getEvidencePending } from "@/lib/api/evidence-review";
import { getPendingValidations } from "@/lib/api/validation";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const EVIDENCE_PAGE_LIMIT = 50;
const BASE_PATH = "/dashboard/clubs/validations";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("queues.classes");
  return { title: t("title") };
}

export default async function ClubsValidationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const raw = await searchParams;

  const access = {
    validations: canViewScreen(user, "validations-investitures"),
    proposals: canViewScreen(user, "honor-instructor-proposals"),
  };
  const tabs = availableClassesTabs(access);
  if (tabs.length === 0) return <PageAccessForbidden />;

  const rawTab = first(raw.tab);
  // Bulk certificate imports left this page; old links go to their own queue.
  if (rawTab === "certificates") redirect("/dashboard/certificate-bulk-imports");

  const tab = resolveClassesTab(rawTab, tabs);
  const typeFilter = legacyEvidenceType(rawTab) ?? resolveEvidenceTypeFilter(first(raw.type));

  // Keep the URL canonical so the tab bar always has an active tab (legacy ?tab=honors|sections|modules).
  if (rawTab !== undefined && rawTab !== tab) {
    const params = new URLSearchParams({ tab });
    if (tab === "evidence" && typeFilter !== "all") params.set("type", typeFilter);
    redirect(`${BASE_PATH}?${params.toString()}`);
  }

  const evidenceType = typeFilter === "all" ? undefined : typeFilter;

  const [pending, evidence, evidenceAll] = access.validations
    ? await Promise.all([
        settle(getPendingValidations({ entity_type: "honor" })),
        tab === "evidence"
          ? settle(getEvidencePending(evidenceType, 1, EVIDENCE_PAGE_LIMIT))
          : Promise.resolve(null),
        // The tab counter is the real total of the whole queue, not of the loaded page or filter.
        tab !== "evidence" || evidenceType !== undefined
          ? settle(getEvidencePending(undefined, 1, 1))
          : Promise.resolve(null),
      ])
    : [null, null, null];

  const evidenceTotal = !access.validations
    ? undefined
    : evidenceAll
      ? evidenceAll.ok
        ? evidenceAll.data.total
        : undefined
      : evidence?.ok
        ? evidence.data.total
        : undefined;

  return (
    <ClassesQueueClient
      tabs={tabs}
      canProposals={access.proposals}
      pending={pending}
      evidence={evidence}
      evidenceTotal={evidenceTotal}
      typeFilter={typeFilter}
    />
  );
}
