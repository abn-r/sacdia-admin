"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeightSumIndicatorProps {
  sum: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeightSumIndicator({ sum }: WeightSumIndicatorProps) {
  const t = useTranslations("rankingWeights.sum");
  const ok = sum === 100;
  return (
    <Badge
      variant={ok ? "soft-success" : "destructive"}
      className="font-mono tabular-nums"
    >
      {t("label", { sum })} {ok ? "✓" : "✗"}
    </Badge>
  );
}
