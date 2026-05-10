import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getCronRunsHistory } from "@/lib/api/analytics";
import { CronHistoryClient } from "./_components/cron-history-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 0;

// ─── Error Banner ─────────────────────────────────────────────────────────────

function CronHistoryError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    job_name?: string;
    status?: string;
    since?: string;
    until?: string;
    page?: string;
  }>;
}

export default async function CronHistoryPage({ searchParams }: PageProps) {
  await requireAdminUser();
  const t = await getTranslations("system_jobs");

  const params = await searchParams;

  const normalizedStatus =
    params.status && params.status !== "all" ? params.status : undefined;
  const normalizedJobName =
    params.job_name && params.job_name !== "all" ? params.job_name : undefined;

  let historyData;
  let fetchError = false;

  try {
    historyData = await getCronRunsHistory({
      job_name: normalizedJobName,
      status: normalizedStatus,
      since: params.since,
      until: params.until,
      page: params.page ? Number(params.page) : 1,
      limit: 20,
    });
  } catch (err) {
    console.error("[CronHistoryPage] Failed to load cron history:", err);
    fetchError = true;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/system/jobs">
              <ChevronLeft className="size-4 mr-1" />
              {t("pageHistory.back")}
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("pageHistory.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("pageHistory.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {fetchError || !historyData ? (
        <CronHistoryError message={t("pageHistory.errorLoad")} />
      ) : (
        <CronHistoryClient
          initialData={historyData}
          searchParams={{
            job_name: params.job_name,
            status: params.status,
            since: params.since,
            until: params.until,
            page: params.page,
          }}
        />
      )}
    </div>
  );
}
