import { getTranslations } from "next-intl/server";
import {
  PastorsClientPage,
  type DistrictPastorsEntry,
  type PastorsLoadError,
} from "@/components/investiture-config/pastors-client-page";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import { LocalFieldPicker } from "@/components/local-field-config/local-field-picker";
import { ApiError } from "@/lib/api/client";
import { listDistricts, type District } from "@/lib/api/geography";
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

/** Catalog rows expose the PK as `district_id`; the raw column is `districlub_type_id`. */
type CatalogDistrict = District & { districlub_type_id?: number };

function toDistrictOption(
  district: CatalogDistrict,
): { districtId: number; name: string; localFieldId: number; active: boolean } | null {
  const districtId = Number(district.districlub_type_id ?? district.district_id);
  if (!Number.isInteger(districtId) || districtId <= 0) return null;
  return {
    districtId,
    name: district.name,
    localFieldId: district.local_field_id,
    active: district.active !== false,
  };
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
      // The public catalog (not /admin/districts, which is admin-only) so the roles that
      // assign pastors can load the districts of their field.
      const rows = (await listDistricts(localFieldId))
        .map(toDistrictOption)
        .filter((district): district is NonNullable<typeof district> => district !== null)
        .filter((district) => district.active && district.localFieldId === localFieldId)
        .sort((left, right) => left.name.localeCompare(right.name));

      districts = await Promise.all(
        rows.map(async (district): Promise<DistrictPastorsEntry> => {
          try {
            return {
              districtId: district.districtId,
              name: district.name,
              list: await listDistrictPastors(district.districtId),
              error: null,
            };
          } catch (error) {
            return {
              districtId: district.districtId,
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
