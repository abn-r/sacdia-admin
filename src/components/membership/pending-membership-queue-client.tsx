"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PanelDashboardLink } from "@/components/shared/panel-dashboard-link";
import { approveMembershipRequest } from "@/lib/api/membership-requests";
import type { PendingMembershipPreview } from "@/lib/dashboard/fetch-scoped-dashboard";
import { ApiError } from "@/lib/api/client";
import { usePanelPath } from "@/lib/v2/panel-path-context";

interface PendingMembershipQueueClientProps {
  previews: PendingMembershipPreview[];
  totalCount: number;
  compact?: boolean;
}

export function PendingMembershipQueueClient({
  previews,
  totalCount,
  compact = false,
}: PendingMembershipQueueClientProps) {
  const t = useTranslations("dashboardHub.pendingMembership");
  const router = useRouter();
  const { toPanelPath } = usePanelPath();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleApprove(item: PendingMembershipPreview) {
    setPendingId(item.assignmentId);
    try {
      await approveMembershipRequest(item.clubSectionId, item.assignmentId);
      toast.success(t("approveSuccess"));
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("approveError");
      toast.error(message);
    } finally {
      setPendingId(null);
    }
  }

  if (previews.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {previews.map((item) => {
        const isPending = pendingId === item.assignmentId;
        const clubHref = item.clubId
          ? toPanelPath(`/dashboard/clubs/${item.clubId}?panel=membership`)
          : toPanelPath("/dashboard/clubs");

        return (
          <div
            key={item.assignmentId}
            className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-medium">{item.userName}</p>
              <p className="truncate text-xs text-muted-foreground">
                <Link href={clubHref} prefetch={false} className="hover:text-primary hover:underline">
                  {item.clubName}
                </Link>
                {" · "}
                {item.sectionLabel}
              </p>
            </div>
            {!compact ? (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => void handleApprove(item)}
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  {t("approve")}
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <PanelDashboardLink href="/dashboard/requests/membership" prefetch={false}>
                    <XCircle className="size-3.5" />
                    {t("review")}
                  </PanelDashboardLink>
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
      {totalCount > previews.length ? (
        <p className="text-xs text-muted-foreground">
          {t("more", { count: totalCount - previews.length })}
        </p>
      ) : null}
    </div>
  );
}
