import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { LocalFieldPicker } from "@/components/local-field-config/local-field-picker";
import { DeliveryConfigForm } from "@/components/local-field-config/delivery-config-form";
import { getConfig } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { listLocalFieldsForTerritory } from "@/lib/auth/territory-scope";
import {
  canPickLocalField,
  pickLocalFieldIdInScope,
  resolveUserLocalField,
  toLocalFieldOptions,
} from "@/lib/auth/user-local-field";
import { hasPermission } from "@/lib/auth/permission-utils";
import type { LocalFieldOption, MaterialConfig } from "@/lib/types/materials";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function resolveLfParam(raw: unknown): number | undefined {
  const n = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function LocalFieldDeliveryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("localFieldConfig.pages.delivery");
  const user = await requireAdminUser();

  if (!hasPermission(user, "materiales:configure")) {
    redirect("/dashboard");
  }

  const scope = resolveUserLocalField(user);
  const canPickField = canPickLocalField(scope);
  const raw = await searchParams;
  const lfOverride = resolveLfParam(raw["local_field_id"]);

  let config: MaterialConfig | null = null;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;
  let localFields: LocalFieldOption[] = [];

  try {
    localFields = toLocalFieldOptions(
      await listLocalFieldsForTerritory(user),
    );
  } catch {
    localFields = [];
  }

  const targetLocalFieldId =
    pickLocalFieldIdInScope(
      scope,
      lfOverride,
      new Set(localFields.map((field) => field.local_field_id)),
    ) ?? null;

  if (targetLocalFieldId != null) {
    try {
      config = await getConfig({ localFieldId: targetLocalFieldId });
    } catch (error) {
      if (error instanceof ApiError) {
        loadError = error.message;
        loadErrorStatus = error.status;
      } else {
        loadError = t("loadError");
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbRoot"), href: "/dashboard" },
          { label: t("breadcrumbGroup") },
          { label: t("title") },
        ]}
      />

      {canPickField && (
        <LocalFieldPicker
          currentLocalFieldId={targetLocalFieldId}
          localFields={localFields}
          label={t("localFieldLabel")}
          placeholder={t("localFieldPlaceholder")}
        />
      )}

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {canPickField && targetLocalFieldId == null && !loadError && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t("selectLocalField")}
        </div>
      )}

      {config && targetLocalFieldId != null && (
        <DeliveryConfigForm config={config} localFieldId={targetLocalFieldId} />
      )}
    </div>
  );
}
