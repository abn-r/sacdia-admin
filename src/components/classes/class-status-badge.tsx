"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface ClassStatusBadgeProps {
  active: boolean;
}

export function ClassStatusBadge({ active }: ClassStatusBadgeProps) {
  const t = useTranslations("classes.status");
  return (
    <Badge variant={active ? "soft-success" : "outline"}>
      {active ? t("active") : t("inactive")}
    </Badge>
  );
}
