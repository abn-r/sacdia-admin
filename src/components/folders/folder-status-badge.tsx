"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FolderActiveStatus = "active" | "inactive";

const statusVariant: Record<FolderActiveStatus, "success" | "secondary"> = {
  active: "success",
  inactive: "secondary",
};

interface FolderStatusBadgeProps {
  active: boolean;
  className?: string;
}

export function FolderStatusBadge({ active, className }: FolderStatusBadgeProps) {
  const t = useTranslations("folders.statusBadge");
  const key: FolderActiveStatus = active ? "active" : "inactive";

  return (
    <Badge variant={statusVariant[key]} className={cn("text-xs", className)}>
      {t(key)}
    </Badge>
  );
}
