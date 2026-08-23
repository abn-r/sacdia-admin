import type { MaterialConfig, LocalFieldOption } from "@/lib/types/materials";
import type { UserLocalFieldScope } from "@/lib/auth/user-local-field";

export type PaymentMethodRow = {
  localFieldId: number;
  name: string;
  abbreviation: string;
  config: MaterialConfig | null;
  configured: boolean;
  canManage: boolean;
};

export function isPaymentMethodConfigured(
  config: Pick<
    MaterialConfig,
    "bank_name" | "bank_account_clabe" | "account_holder"
  > | null | undefined,
): boolean {
  return Boolean(
    config?.bank_name?.trim() &&
      config?.account_holder?.trim() &&
      config?.bank_account_clabe?.trim()?.length === 18,
  );
}

export function buildPaymentMethodRows(
  localFields: LocalFieldOption[],
  configs: MaterialConfig[],
  scope: UserLocalFieldScope,
): PaymentMethodRow[] {
  const configByLf = new Map(
    configs.map((config) => [config.local_field_id, config]),
  );

  const visibleFields =
    scope.scope === "single"
      ? localFields.filter((lf) => lf.local_field_id === scope.localFieldId)
      : localFields;

  return visibleFields
    .map((lf) => {
      const config = configByLf.get(lf.local_field_id) ?? null;
      const canManage =
        scope.scope !== "single" || scope.localFieldId === lf.local_field_id;

      return {
        localFieldId: lf.local_field_id,
        name: lf.name,
        abbreviation: lf.abbreviation,
        config,
        configured: isPaymentMethodConfigured(config),
        canManage,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function maskClabe(clabe: string | null | undefined): string {
  if (!clabe || clabe.length < 4) return "—";
  return `•••• ${clabe.slice(-4)}`;
}
