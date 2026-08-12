"use client";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirementReviewTray } from "@/components/certifications/requirement-review-tray";
import { FinalReviewTray } from "@/components/certifications/final-review-tray";

export function CertificationReviewsClient() {
  const t = useTranslations("certification_reviews");

  return (
    <Tabs defaultValue="requirements" className="space-y-4">
      <TabsList>
        <TabsTrigger value="requirements">{t("tabs.requirements")}</TabsTrigger>
        <TabsTrigger value="final">{t("tabs.final")}</TabsTrigger>
      </TabsList>
      <TabsContent value="requirements">
        <RequirementReviewTray />
      </TabsContent>
      <TabsContent value="final">
        <FinalReviewTray />
      </TabsContent>
    </Tabs>
  );
}
