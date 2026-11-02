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
  getInvestitureWindow,
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
  let windowError: FieldConfigLoadError | null = null;

  if (localFieldId !== null && yearId !== null) {
    // The class percentage is no longer shown: since 2026-11-02 only a
    // validated requirement counts as complete, so it does not change anything.
    try {
      window = await getInvestitureWindow(localFieldId, yearId);
    } catch (error) {
      windowError = toLoadError(error, t);
    }
  }

  return (
    <FieldConfigClientPage
      localFieldId={localFieldId}
      yearId={yearId}
      years={years}
      window={window}
      windowError={windowError}
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
