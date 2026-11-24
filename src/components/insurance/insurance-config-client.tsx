"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SettingsSection } from "@/components/shared/settings-rows";
import { InsuranceProductsPanel } from "@/components/insurance/insurance-products-panel";
import { InsuranceCyclesPanel } from "@/components/insurance/insurance-cycles-panel";
import { PaymentInstructionsPanel } from "@/components/insurance/payment-instructions-panel";
import type { LocalField } from "@/lib/api/geography";

interface InsuranceConfigClientProps {
  /** Global admins (no territorial LF) must pick the local field explicitly. */
  requiresLocalFieldId: boolean;
  localFieldOptions?: LocalField[];
  canConfigureInsurance: boolean;
  canConfigurePaymentInstructions: boolean;
}

export function InsuranceConfigClient({
  requiresLocalFieldId,
  localFieldOptions = [],
  canConfigureInsurance,
  canConfigurePaymentInstructions,
}: InsuranceConfigClientProps) {
  const t = useTranslations("insurance_config");
  // Admins without a local field pick one for products and cycles; with a
  // single option it is preselected.
  const [selectedFieldId, setSelectedFieldId] = useState<number | undefined>(
    localFieldOptions.length === 1
      ? localFieldOptions[0].local_field_id
      : undefined,
  );
  const fieldMissing = requiresLocalFieldId && selectedFieldId === undefined;

  const fieldPicker = requiresLocalFieldId ? (
    <div className="space-y-1.5">
      <Label htmlFor="insurance-config-local-field">
        {t("picker.label")}
      </Label>
      <Select
        value={selectedFieldId === undefined ? "" : String(selectedFieldId)}
        onValueChange={(value) => setSelectedFieldId(Number(value))}
      >
        <SelectTrigger id="insurance-config-local-field" className="w-64">
          <SelectValue placeholder={t("picker.placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {localFieldOptions.map((field) => (
            <SelectItem
              key={field.local_field_id}
              value={String(field.local_field_id)}
            >
              {field.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  const insurancePanel = (panel: "products" | "cycles") => {
    if (fieldMissing) {
      return (
        <p className="text-muted-foreground text-sm">
          {t("picker.required")}
        </p>
      );
    }
    return panel === "products" ? (
      <InsuranceProductsPanel key={`products-${selectedFieldId}`} localFieldId={selectedFieldId} />
    ) : (
      <InsuranceCyclesPanel key={`cycles-${selectedFieldId}`} localFieldId={selectedFieldId} />
    );
  };

  return (
    <div className="space-y-2">
      {canConfigureInsurance && (
        <>
          {fieldPicker}
          {fieldMissing ? (
            insurancePanel("products")
          ) : (
            <>
              {insurancePanel("products")}
              {insurancePanel("cycles")}
            </>
          )}
        </>
      )}
      {canConfigurePaymentInstructions && (
        <SettingsSection title={t("tabs.paymentInstructions")}>
          <div className="p-5">
            {canConfigureInsurance && fieldMissing ? (
              <p className="text-muted-foreground text-sm">{t("picker.required")}</p>
            ) : (
              <PaymentInstructionsPanel
                requiresLocalFieldId={requiresLocalFieldId}
                localFieldOptions={localFieldOptions}
                // The picker above drives every section when it is shown.
                controlledFieldId={canConfigureInsurance && requiresLocalFieldId ? (selectedFieldId ?? null) : undefined}
              />
            )}
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
