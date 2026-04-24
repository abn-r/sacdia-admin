import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { entityConfigs, type EntityKey } from "@/lib/catalogs/entities";
import { listEntityItems, getSelectOptions } from "@/lib/catalogs/service";
import {
  createCatalogItemAction,
  updateCatalogItemAction,
} from "@/lib/catalogs/actions";
import { CatalogCrudPage } from "@/components/catalogs/catalog-crud-page";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError } from "@/lib/api/client";

interface CatalogEntityPageProps {
  entityKey: EntityKey;
}

export async function CatalogEntityPage({ entityKey }: CatalogEntityPageProps) {
  await requireAdminUser();
  const t = await getTranslations("catalogs");

  const config = entityConfigs[entityKey];

  let items: Record<string, unknown>[] = [];
  let loadError: string | null = null;

  try {
    items = await listEntityItems(entityKey);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
  }

  const selectOptionsMap: Record<string, { label: string; value: number }[]> = {};
  const displaySelectOptionsMap: Record<string, { label: string; value: number }[]> = {};
  const selectFields = config.fields.filter((f) => f.type === "select" && f.optionsEntityKey);

  await Promise.all(
    selectFields.map(async (field) => {
      if (!field.optionsEntityKey) return;
      try {
        // Always include inactive entries in form options so:
        // (a) Edit dialogs can preselect an existing inactive parent
        // (b) Parent dropdowns show all records for both create and edit
        const [formOptions, displayOptions] = await Promise.all([
          getSelectOptions(field.optionsEntityKey, true),
          getSelectOptions(field.optionsEntityKey, true),
        ]);

        selectOptionsMap[field.optionsEntityKey] = formOptions;
        displaySelectOptionsMap[field.optionsEntityKey] = displayOptions;
      } catch {
        selectOptionsMap[field.optionsEntityKey!] = [];
        displaySelectOptionsMap[field.optionsEntityKey!] = [];
      }
    }),
  );

  const boundCreateAction = createCatalogItemAction.bind(null, entityKey, config.routeBase);

  if (loadError) {
    return (
      <div className="space-y-6">
        <EndpointErrorBanner state="missing" detail={loadError} />
        <CatalogCrudPage
          config={config}
          items={[]}
          selectOptions={selectOptionsMap}
          displaySelectOptions={displaySelectOptionsMap}
          createAction={boundCreateAction}
          updateActionBase={updateCatalogItemAction}
          entityKey={entityKey}
          routeBase={config.routeBase}
        />
      </div>
    );
  }

  return (
    <CatalogCrudPage
      config={config}
      items={items}
      selectOptions={selectOptionsMap}
      displaySelectOptions={displaySelectOptionsMap}
      createAction={boundCreateAction}
      updateActionBase={updateCatalogItemAction}
      entityKey={entityKey}
      routeBase={config.routeBase}
    />
  );
}
