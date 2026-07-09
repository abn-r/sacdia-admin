import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/auth/session";
import { fetchPendingMembershipSummary } from "@/lib/dashboard/fetch-scoped-dashboard";
import { PendingMembershipQueueClient } from "@/components/membership/pending-membership-queue-client";

export async function PendingMembershipQueue({
  variant = "card",
}: {
  variant?: "card" | "inline";
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("dashboardHub.pendingMembership");
  const summary = await fetchPendingMembershipSummary(user);

  if (!summary.canReview) {
    return null;
  }

  if (summary.totalCount === 0) {
    if (variant === "inline") return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <CardDescription>{t("empty")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (variant === "inline") {
    return (
      <PendingMembershipQueueClient
        previews={summary.previews}
        totalCount={summary.totalCount}
      />
    );
  }

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-warning/15 text-warning-foreground dark:text-warning">
              <UserPlus className="size-4" />
            </div>
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </div>
          <CardDescription>
            {t("description", { count: summary.totalCount })}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/requests/membership" prefetch={false}>
            {t("reviewAll")}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <PendingMembershipQueueClient
          previews={summary.previews}
          totalCount={summary.totalCount}
          compact
        />
      </CardContent>
    </Card>
  );
}
