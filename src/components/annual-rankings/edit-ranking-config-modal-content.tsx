import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FormModalBody } from "@/components/shared/form-modal";
import { AnnualFolderSetupNotice } from "@/components/annual-folders/annual-folder-setup-notice";
import { AnnualBudgetConfigForm } from "@/components/annual-rankings/annual-budget-config-form";
import type { RankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

type EditableConfig = NonNullable<RankingConfigPageData["configs"][number]>;

/**
 * Body of the "edit ranking config" modal. A load error replaces the form; a
 * setup gap is only a notice here (editing an existing config stays allowed,
 * as on the former full page).
 */
export function EditRankingConfigModalContent({
  data,
  config,
}: {
  data: RankingConfigPageData;
  config: EditableConfig;
}) {
  if (data.loadError) {
    return (
      <FormModalBody>
        <EndpointErrorBanner state="missing" detail={data.loadError} />
      </FormModalBody>
    );
  }

  return (
    <>
      {data.createGap ? (
        <div className="px-6 pb-4">
          <AnnualFolderSetupNotice gap={data.createGap} />
        </div>
      ) : null}
      <AnnualBudgetConfigForm
        mode="edit"
        config={config}
        unions={data.unions}
        localFields={data.localFields}
        clubTypes={data.clubTypes}
        ecclesiasticalYears={data.ecclesiasticalYears}
      />
    </>
  );
}
