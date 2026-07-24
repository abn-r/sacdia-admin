"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceReviewTable } from "@/components/evidence-review/evidence-review-table";
import {
  getEvidencePending,
  type EvidenceItem,
  type EvidenceType,
} from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";

interface EvidenceReviewPanelProps {
  evidenceType: EvidenceType;
  initialItems: EvidenceItem[];
}

export function EvidenceReviewPanel({
  evidenceType,
  initialItems,
}: EvidenceReviewPanelProps) {
  const t = useTranslations("evidence_review.client");
  const [items, setItems] = useState(
    initialItems.filter((item) => item.type === evidenceType),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await getEvidencePending(evidenceType, 1, 200);
      setItems(result.data.filter((item) => item.type === evidenceType));
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("error_refresh");
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [evidenceType, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isRefreshing}>
          <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {t("btn_refresh")}
        </Button>
      </div>
      <EvidenceReviewTable items={items} onRefresh={refresh} />
    </div>
  );
}
