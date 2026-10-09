import { getTranslations } from "next-intl/server";
import {
  FieldConfigClientPage,
  type FieldConfigLoadError,
} from "@/components/investiture-config/field-config-client-page";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import { LocalFieldPicker } from "@/components/local-field-config/local-field-picker";
import { ApiError } from "@/lib/api/client";
import {
  getActiveEcclesiasticalYearId,
  listEcclesiasticalYears,
  type EcclesiasticalYear,
} from "@/lib/api/catalogs";
import {
  getFieldClassThreshold,
  getInvestitureWindow,
  type FieldClassThreshold,
  type InvestitureWindow,
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

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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
    // Without the list the picker is empty; single-field users still resolve their own field.
  }

  const localFieldId =
    pickLocalFieldIdInScope(
      scope,
      parsePositiveInt(params.local_field_id) ?? undefined,
      new Set(localFields.map((field) => field.local_field_id)),
    ) ?? null;

  const yearId = parsePositiveInt(params.year) ?? (await getActiveEcclesiasticalYearId());

  let years: EcclesiasticalYear[] = [];
  try {
    years = await listEcclesiasticalYears();
  } catch {
    // The selector degrades to an empty list; the configuration still loads.
  }

  let window: InvestitureWindow | null = null;
  let threshold: FieldClassThreshold | null = null;
  let windowError: FieldConfigLoadError | null = null;
  let thresholdError: FieldConfigLoadError | null = null;

  if (localFieldId !== null && yearId !== null) {
    // Independent reads: the percentage is visible only to the Field and super-admin,
    // so a 403 there must not hide the window that union, DIA and admin roles can read.
    const [windowResult, thresholdResult] = await Promise.allSettled([
      getInvestitureWindow(localFieldId, yearId),
      getFieldClassThreshold(localFieldId, yearId),
    ]);

    if (windowResult.status === "fulfilled") {
      window = windowResult.value;
    } else {
      windowError = toLoadError(windowResult.reason, t);
    }

    if (thresholdResult.status === "fulfilled") {
      threshold = thresholdResult.value;
    } else {
      thresholdError = toLoadError(thresholdResult.reason, t);
    }
  }

  return (
    <FieldConfigClientPage
      localFieldId={localFieldId}
      yearId={yearId}
      years={years}
      window={window}
      threshold={threshold}
      windowError={windowError}
      thresholdError={thresholdError}
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

function toLoadError(
  error: unknown,
  t: Parameters<typeof getInvestitureRequestErrorMessage>[1],
): FieldConfigLoadError {
  return {
    status: error instanceof ApiError ? error.status : null,
    message: getInvestitureRequestErrorMessage(error, t),
  };
}
