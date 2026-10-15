import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FormModalBody } from "@/components/shared/form-modal";
import { AnnualFolderSetupNotice } from "@/components/annual-folders/annual-folder-setup-notice";
import { AnnualBudgetConfigForm } from "@/components/annual-rankings/annual-budget-config-form";
import type { RankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

/**
 * Body of the "new ranking config" modal: load error or setup gap replace the
 * form (same gating as the former full page); otherwise the two-step form.
 */
export function NewRankingConfigModalContent({ data }: { data: RankingConfigPageData }) {
  if (data.loadError) {
    return (
      <FormModalBody>
        <EndpointErrorBanner state="missing" detail={data.loadError} />
      </FormModalBody>
    );
  }

  if (data.createGap) {
    return (
      <FormModalBody>
        <AnnualFolderSetupNotice gap={data.createGap} />
      </FormModalBody>
    );
  }

  return (
    <AnnualBudgetConfigForm
      mode="create"
      layout="modal"
      unions={data.unions}
      localFields={data.localFields}
      clubTypes={data.clubTypes}
      ecclesiasticalYears={data.ecclesiasticalYears}
    />
  );
}
