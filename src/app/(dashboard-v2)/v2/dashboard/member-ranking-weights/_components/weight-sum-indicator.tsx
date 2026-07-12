"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

interface WeightSumIndicatorProps {
  values: number[];
}

/**
 * Live percentage-sum badge used inside the weights form dialog.
 * Renders green (success) when sum is within ±0.01 of 100, red (destructive)
 * otherwise — matching the backend IEEE float tolerance:
 *   Math.abs(sum - 100) <= 0.01
 */
export function WeightSumIndicator({ values }: WeightSumIndicatorProps) {
  const t = useTranslations("memberRankingWeights.sumIndicator");

  const sum = values.reduce(
    (acc, v) => acc + (Number.isFinite(v) ? v : 0),
    0,
  );
  const isValid = Math.abs(sum - 100) <= 0.01;

  return (
    <Badge variant={isValid ? "success" : "destructive"}>
      {t("label", { sum: sum.toFixed(2) })} {isValid ? t("valid") : t("invalid")}
    </Badge>
  );
}
