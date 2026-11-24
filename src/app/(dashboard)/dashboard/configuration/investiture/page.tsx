import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  InvestitureSettingsClientPage,
  type DistrictPastorsEntry,
  type SettingsLoadError,
} from "@/components/investiture-config/investiture-settings-client-page";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import { LocalFieldPicker } from "@/components/local-field-config/local-field-picker";
import { ApiError } from "@/lib/api/client";
import {
  getActiveEcclesiasticalYearId,
  listEcclesiasticalYears,
  type EcclesiasticalYear,
} from "@/lib/api/catalogs";
import { listDistricts, type District } from "@/lib/api/geography";
import {
  getInvestitureWindow,
  getPastorQuota,
  listDistrictPastors,
  type InvestitureWindow,
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

function toLoadError(error: unknown, t: ErrorTranslator): SettingsLoadError {
  return {
    status: error instanceof ApiError ? error.status : null,
    message: getInvestitureRequestErrorMessage(error, t),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("queues.investitures.settings");
  return { title: t("title") };
}

/**
 * Investiture settings: the Field window and the pastors of each district in
 * one screen. Replaces `/dashboard/investiture-settings` and
 * `/dashboard/investiture-pastors`, which now redirect here.
 */
export default async function InvestitureSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("investiture_requests");
  const tPage = await getTranslations("investiture_config.settings");
  const params = await searchParams;

  const scope = resolveUserLocalField(user);
  const canPickField = canPickLocalField(scope);

  let localFields: LocalFieldOption[] = [];
  try {
    localFields = toLocalFieldOptions(await listLocalFieldsForTerritory(user));
  } catch {
    // Single-field users still resolve their own field; the picker stays empty.
  }

  const localFieldId =
    pickLocalFieldIdInScope(
      scope,
      parsePositiveInt(params.local_field_id),
      new Set(localFields.map((field) => field.local_field_id)),
    ) ?? null;

  const yearId = parsePositiveInt(params.year) ?? (await getActiveEcclesiasticalYearId());

  let years: EcclesiasticalYear[] = [];
  try {
    years = await listEcclesiasticalYears();
  } catch {
    // The window still loads; the selector degrades to an empty list.
  }

  const settle = async <T,>(
    load: () => Promise<T>,
  ): Promise<{ data: T | null; error: SettingsLoadError | null }> => {
    try {
      return { data: await load(), error: null };
    } catch (error) {
      return { data: null, error: toLoadError(error, t) };
    }
  };

  const loadDistricts = async (fieldId: number): Promise<DistrictPastorsEntry[]> => {
    // The public catalog (not /admin/districts, which is admin-only) so the roles
    // that assign pastors can load the districts of their field.
    const rows = (await listDistricts(fieldId))
      .map(toDistrictOption)
      .filter((district): district is NonNullable<typeof district> => district !== null)
      .filter((district) => district.active && district.localFieldId === fieldId)
      .sort((left, right) => left.name.localeCompare(right.name));

    return Promise.all(
      rows.map(async (district): Promise<DistrictPastorsEntry> => {
        const result = await settle(() => listDistrictPastors(district.districtId));
        return {
          districtId: district.districtId,
          name: district.name,
          list: result.data,
          error: result.error,
        };
      }),
    );
  };

  const [windowResult, quotaResult, districtsResult] =
    localFieldId === null
      ? [null, null, null]
      : await Promise.all([
          yearId === null ? null : settle(() => getInvestitureWindow(localFieldId, yearId)),
          settle(() => getPastorQuota()),
          settle(() => loadDistricts(localFieldId)),
        ]);

  const window: InvestitureWindow | null = windowResult?.data ?? null;
  const quota: PastorQuota | null = quotaResult?.data ?? null;

  return (
    <InvestitureSettingsClientPage
      localFieldId={localFieldId}
      yearId={yearId}
      years={years}
      window={window}
      windowError={windowResult?.error ?? null}
      districts={districtsResult?.data ?? []}
      districtsError={districtsResult?.error ?? null}
      quota={quota}
      quotaError={quotaResult?.error ?? null}
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
