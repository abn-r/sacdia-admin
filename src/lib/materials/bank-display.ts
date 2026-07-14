import type { MaterialConfig, Orden } from "@/lib/types/materials";
import { isPaymentMethodConfigured } from "@/lib/local-field-config/payment-method-rows";

export type BankDisplaySource = "snapshot" | "live" | "missing";

export type BankDisplayData = {
  bank_name: string | null;
  bank_account_clabe: string | null;
  account_holder: string | null;
  pickup_address: string | null;
  source: BankDisplaySource;
};

export function resolveBankDisplay(
  orden: Orden,
  liveConfig?: MaterialConfig | null,
): BankDisplayData {
  const snapshotConfigured = isPaymentMethodConfigured({
    bank_name: orden.bank_name,
    bank_account_clabe: orden.bank_account_clabe,
    account_holder: orden.account_holder,
  });

  if (snapshotConfigured) {
    return {
      bank_name: orden.bank_name,
      bank_account_clabe: orden.bank_account_clabe,
      account_holder: orden.account_holder,
      pickup_address: orden.pickup_address,
      source: "snapshot",
    };
  }

  if (liveConfig && isPaymentMethodConfigured(liveConfig)) {
    return {
      bank_name: liveConfig.bank_name,
      bank_account_clabe: liveConfig.bank_account_clabe,
      account_holder: liveConfig.account_holder,
      pickup_address: liveConfig.pickup_address ?? orden.pickup_address,
      source: "live",
    };
  }

  return {
    bank_name: null,
    bank_account_clabe: null,
    account_holder: null,
    pickup_address: orden.pickup_address,
    source: "missing",
  };
}

export function ordenWithBankDisplay(
  orden: Orden,
  display: BankDisplayData,
): Orden {
  return {
    ...orden,
    bank_name: display.bank_name,
    bank_account_clabe: display.bank_account_clabe,
    account_holder: display.account_holder,
    pickup_address: display.pickup_address,
  };
}
