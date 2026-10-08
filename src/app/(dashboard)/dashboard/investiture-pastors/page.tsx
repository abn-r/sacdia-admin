import { getTranslations } from "next-intl/server";
import {
  PastorsClientPage,
  type DistrictPastorsEntry,
  type PastorsLoadError,
} from "@/components/investiture-config/pastors-client-page";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import { LocalFieldPicker } from "@/components/local-field-config/local-field-picker";
import { listAdminDistricts } from "@/lib/api/admin-districts";
import { ApiError } from "@/lib/api/client";
import {
  getPastorQuota,
  listDistrictPastors,
  type PastorQuota,
} from "@/lib/api/investiture-field-config";
import { requireAdminUser } from "@/lib/auth/session";
import { listLocalFieldsForTerritory } from "@/lib/auth/territory-scope";
import {
  canPickLocalField,
  pickLocalFieldIdInScope,
  resolveUserLocalField,
  toLocalFieldOptions,
} from "@/lib/auth/user-local-field";
import type { LocalFieldOption } from "@/lib/types/materials";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ErrorTranslator = Parameters<typeof getInvestitureRequestErrorMessage>[1];

function parsePositiveInt(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toLoadError(error: unknown, t: ErrorTranslator): PastorsLoadError {
  return {
    status: error instanceof ApiError ? error.status : null,
    message: getInvestitureRequestErrorMessage(error, t),
  };
}

export default async function InvestiturePastorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("investiture_requests");
  const tPage = await getTranslations("investiture_config.pastors");
  const params = await searchParams;

  const scope = resolveUserLocalField(user);
  const canPickField = canPickLocalField(scope);

  let localFields: LocalFieldOption[] = [];
  try {
    localFields = toLocalFieldOptions(await listLocalFieldsForTerritory(user));
  } catch {
    // Without the list the picker is empty; single-field users still resolve their own field.
  }

  const localFieldId =
    pickLocalFieldIdInScope(
      scope,
      parsePositiveInt(params.local_field_id),
      new Set(localFields.map((field) => field.local_field_id)),
    ) ?? null;

  let quota: PastorQuota | null = null;
  let quotaError: PastorsLoadError | null = null;
  try {
    quota = await getPastorQuota();
  } catch (error) {
    quotaError = toLoadError(error, t);
  }

  let districts: DistrictPastorsEntry[] = [];
  let loadError: PastorsLoadError | null = null;

  if (localFieldId !== null) {
    try {
      // PK is `districlub_type_id`; `normalizeDistrict` exposes it as `district_id`.
      const rows = (await listAdminDistricts({ localFieldId }))
        .filter((district) => district.active && district.local_field_id === localFieldId)
        .sort((left, right) => left.name.localeCompare(right.name));

      districts = await Promise.all(
        rows.map(async (district): Promise<DistrictPastorsEntry> => {
          try {
            return {
              districtId: district.district_id,
              name: district.name,
              list: await listDistrictPastors(district.district_id),
              error: null,
            };
          } catch (error) {
            return {
              districtId: district.district_id,
              name: district.name,
              list: null,
              error: toLoadError(error, t),
            };
          }
        }),
      );
    } catch (error) {
      loadError = toLoadError(error, t);
    }
  }

  return (
    <PastorsClientPage
      localFieldId={localFieldId}
      districts={districts}
      quota={quota}
      quotaError={quotaError}
      loadError={loadError}
      localFieldPicker={
        canPickField ? (
          <LocalFieldPicker
            currentLocalFieldId={localFieldId}
            localFields={localFields}
            label={tPage("localFieldLabel")}
            placeholder={tPage("localFieldPlaceholder")}
          />
        ) : null
      }
    />
  );
}
