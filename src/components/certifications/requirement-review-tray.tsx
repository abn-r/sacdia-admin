"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ClipboardList, ExternalLink, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getRequirementTray,
  type CertificationRequirementStatus,
  type TrayItem,
} from "@/lib/api/certification-reviews";
import { getCertificationReviewErrorMessage } from "@/components/certifications/certification-review-errors";
import { RequirementReviewDetail } from "@/components/certifications/requirement-review-detail";

const STATUS_INTENT: Record<CertificationRequirementStatus, StatusIntent> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CHANGES_REQUESTED: "warning",
  APPROVED: "success",
};

function participantName(item: TrayItem) {
  return [item.participant.name, item.participant.paternal_last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || item.participant.user_id;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function RequirementReviewTray() {
  const t = useTranslations("certification_reviews");
  const [status, setStatus] = useState<CertificationRequirementStatus>("SUBMITTED");
  const [items, setItems] = useState<TrayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgressId, setSelectedProgressId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRequirementTray(status);
      setItems(data);
    } catch (error) {
      toast.error(getCertificationReviewErrorMessage(error, t, "toasts.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="requirement-status-filter" className="text-muted-foreground text-sm">
            {t("tray.filterStatus")}
          </label>
          <select
            id="requirement-status-filter"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as CertificationRequirementStatus)
            }
            aria-label={t("tray.filterStatus")}
          >
            <option value="SUBMITTED">{t("status.SUBMITTED")}</option>
            <option value="CHANGES_REQUESTED">
              {t("status.CHANGES_REQUESTED")}
            </option>
            <option value="APPROVED">{t("status.APPROVED")}</option>
            <option value="DRAFT">{t("status.DRAFT")}</option>
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("tray.refresh")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("tray.loading")}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("tray.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("tray.colParticipant")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colCertification")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colModule")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colRequirement")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colStatus")}</th>
                <th className="px-3 py-2 font-medium">{t("tray.colSubmitted")}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.progress_id} className="border-t">
                  <td className="px-3 py-2">{participantName(item)}</td>
                  <td className="px-3 py-2">{item.certification_name}</td>
                  <td className="px-3 py-2">{item.module_name}</td>
                  <td className="px-3 py-2">{item.section_name}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      intent={STATUS_INTENT[item.status] ?? "neutral"}
                      label={t(`status.${item.status}`)}
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(item.submitted_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedProgressId(item.progress_id)}
                    >
                      {t("tray.openDetail")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RequirementReviewDetail
        progressId={selectedProgressId}
        open={selectedProgressId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedProgressId(null);
        }}
        onChanged={() => void load()}
      />
    </div>
  );
}
