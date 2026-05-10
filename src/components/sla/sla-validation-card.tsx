"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Award } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ValidationSummary } from "@/lib/api/analytics";

interface SlaValidationCardProps {
  validation: ValidationSummary;
}

export function SlaValidationCard({ validation }: SlaValidationCardProps) {
  const t = useTranslations("sla.validation");
  const { class_sections_pending, honors_pending, total_pending } = validation;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>
          {total_pending > 0
            ? t("description_pending", { count: total_pending })
            : t("description_empty")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <GraduationCap className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("class_sections_label")}</p>
              <p className="text-xs text-muted-foreground">{t("class_sections_subtitle")}</p>
            </div>
          </div>
          <Badge
            variant={class_sections_pending === 0 ? "secondary" : class_sections_pending < 10 ? "warning" : "destructive"}
          >
            {class_sections_pending.toLocaleString("es-MX")}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Award className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("honors_label")}</p>
              <p className="text-xs text-muted-foreground">{t("honors_subtitle")}</p>
            </div>
          </div>
          <Badge
            variant={honors_pending === 0 ? "secondary" : honors_pending < 10 ? "warning" : "destructive"}
          >
            {honors_pending.toLocaleString("es-MX")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
