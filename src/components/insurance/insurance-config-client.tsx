"use client";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsuranceProductsPanel } from "@/components/insurance/insurance-products-panel";
import { InsuranceCyclesPanel } from "@/components/insurance/insurance-cycles-panel";
import { PaymentInstructionsPanel } from "@/components/insurance/payment-instructions-panel";

interface InsuranceConfigClientProps {
  /** Global admins (no territorial LF) must pick the local field explicitly. */
  requiresLocalFieldId: boolean;
  canConfigureInsurance: boolean;
  canConfigurePaymentInstructions: boolean;
}

export function InsuranceConfigClient({
  requiresLocalFieldId,
  canConfigureInsurance,
  canConfigurePaymentInstructions,
}: InsuranceConfigClientProps) {
  const t = useTranslations("insurance_config");
  const defaultTab = canConfigureInsurance ? "products" : "payment";

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList>
        {canConfigureInsurance && (
          <>
            <TabsTrigger value="products">{t("tabs.products")}</TabsTrigger>
            <TabsTrigger value="cycles">{t("tabs.cycles")}</TabsTrigger>
          </>
        )}
        {canConfigurePaymentInstructions && (
          <TabsTrigger value="payment">
            {t("tabs.paymentInstructions")}
          </TabsTrigger>
        )}
      </TabsList>
      {canConfigureInsurance && (
        <>
          <TabsContent value="products">
            <InsuranceProductsPanel />
          </TabsContent>
          <TabsContent value="cycles">
            <InsuranceCyclesPanel />
          </TabsContent>
        </>
      )}
      {canConfigurePaymentInstructions && (
        <TabsContent value="payment">
          <PaymentInstructionsPanel
            requiresLocalFieldId={requiresLocalFieldId}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
