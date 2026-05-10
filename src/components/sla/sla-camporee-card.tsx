"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tent, Users, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CamporeeSummary } from "@/lib/api/analytics";

interface SlaCamporeeCardProps {
  camporee: CamporeeSummary;
}

export function SlaCamporeeCard({ camporee }: SlaCamporeeCardProps) {
  const t = useTranslations("sla.camporee");
  const { clubs_pending, members_pending, payments_pending } = camporee;
  const total = clubs_pending + members_pending + payments_pending;

  function badgeVariant(count: number): "secondary" | "warning" | "destructive" {
    if (count === 0) return "secondary";
    if (count < 10) return "warning";
    return "destructive";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>
          {total > 0
            ? t("description_pending", { count: total })
            : t("description_empty")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Tent className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("clubs_label")}</p>
              <p className="text-xs text-muted-foreground">{t("clubs_subtitle")}</p>
            </div>
          </div>
          <Badge variant={badgeVariant(clubs_pending)}>
            {clubs_pending.toLocaleString("es-MX")}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Users className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("members_label")}</p>
              <p className="text-xs text-muted-foreground">{t("members_subtitle")}</p>
            </div>
          </div>
          <Badge variant={badgeVariant(members_pending)}>
            {members_pending.toLocaleString("es-MX")}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <CreditCard className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("payments_label")}</p>
              <p className="text-xs text-muted-foreground">{t("payments_subtitle")}</p>
            </div>
          </div>
          <Badge variant={badgeVariant(payments_pending)}>
            {payments_pending.toLocaleString("es-MX")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
