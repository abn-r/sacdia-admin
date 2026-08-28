import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Banknote } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentMethodsTable } from "@/components/local-field-config/payment-methods-table";
import { getConfig, listConfigAll } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { listLocalFieldsForTerritory } from "@/lib/auth/territory-scope";
import {
  canPickLocalField,
  resolveUserLocalField,
  toLocalFieldOptions,
} from "@/lib/auth/user-local-field";
import { hasPermission } from "@/lib/auth/permission-utils";
import { buildPaymentMethodRows } from "@/lib/local-field-config/payment-method-rows";
import type { LocalFieldOption, MaterialConfig } from "@/lib/types/materials";

export default async function LocalFieldPaymentMethodsPage() {
  const t = await getTranslations("localFieldConfig.pages.paymentMethods");
  const user = await requireAdminUser();

  if (!hasPermission(user, "materiales:configure")) {
    redirect("/dashboard");
  }

  const scope = resolveUserLocalField(user);
  let localFields: LocalFieldOption[] = [];
  let configs: MaterialConfig[] = [];
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    localFields = toLocalFieldOptions(
      await listLocalFieldsForTerritory(user),
    );

    if (scope.scope === "single") {
      configs = [await getConfig({ localFieldId: scope.localFieldId })];
      if (localFields.length === 0) {
        localFields = [
          {
            local_field_id: scope.localFieldId,
            name: t("fallbackLocalFieldName", { id: scope.localFieldId }),
            abbreviation: "",
          },
        ];
      }
    } else {
      configs = await listConfigAll();
    }
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = t("loadError");
    }
  }

  const rows = buildPaymentMethodRows(localFields, configs, scope);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("tableDescription")}
        breadcrumbs={[
          { label: t("breadcrumbRoot"), href: "/dashboard" },
          { label: t("breadcrumbGroup") },
          { label: t("title") },
        ]}
      />

      {!canPickLocalField(scope) && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t("scopedLocalFieldHint")}
        </div>
      )}

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && rows.length === 0 && (
        <EmptyState
          icon={Banknote}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}

      {!loadError && rows.length > 0 && <PaymentMethodsTable rows={rows} />}

      <p className="text-xs text-muted-foreground">
        {t("deliveryHint")}{" "}
        <Link
          href="/dashboard/configuration/local-field/delivery"
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("deliveryLink")}
        </Link>
      </p>
    </div>
  );
}
