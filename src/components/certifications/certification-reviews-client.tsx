"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { RequirementReviewTray } from "@/components/certifications/requirement-review-tray";
import { FinalReviewTray } from "@/components/certifications/final-review-tray";

/**
 * Both trays stay mounted (hidden when inactive) so each tab can show its
 * count without the user opening it first.
 */
export function CertificationReviewsClient() {
  const t = useTranslations("certification_reviews");
  const tab = useUrlTab("tab", "requirements");
  const [requirementCount, setRequirementCount] = useState<number | undefined>(undefined);
  const [finalCount, setFinalCount] = useState<number | undefined>(undefined);
  const active = tab === "final" ? "final" : "requirements";

  return (
    <div className="space-y-4">
      <UrlTabs
        ariaLabel={t("page.title")}
        defaultValue="requirements"
        tabs={[
          { value: "requirements", label: t("tabs.requirements"), ...(requirementCount !== undefined ? { count: requirementCount } : {}) },
          { value: "final", label: t("tabs.final"), ...(finalCount !== undefined ? { count: finalCount } : {}) },
        ]}
      />
      <div hidden={active !== "requirements"}>
        <RequirementReviewTray onCount={setRequirementCount} />
      </div>
      <div hidden={active !== "final"}>
        <FinalReviewTray onCount={setFinalCount} />
      </div>
    </div>
  );
}
