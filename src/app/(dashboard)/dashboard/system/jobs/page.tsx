import Link from "next/link";
import { Suspense } from "react";
import { History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getJobsOverview, getCronRuns } from "@/lib/api/analytics";
import { JobsOverviewClient } from "./_components/jobs-overview-client";
import { CronRunsSection } from "./_components/cron-runs-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const revalidate = 30;

// ─── Skeleton Fallback ────────────────────────────────────────────────────────

function JobsOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Queue cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-10" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Failed jobs table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Error Banners ────────────────────────────────────────────────────────────

function BullMQError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function CronError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-6 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ─── Data Loader (parallel, graceful degradation) ─────────────────────────────

type JobsMessages = {
  bullmqError: string;
  cronError: string;
  cronHeading: string;
  cronDescription: string;
  viewHistory: string;
};

async function JobsContent({ messages }: { messages: JobsMessages }) {
  const [bullmqResult, cronResult] = await Promise.allSettled([
    getJobsOverview(),
    getCronRuns(),
  ]);

  const bullmqSection =
    bullmqResult.status === "fulfilled" ? (
      <JobsOverviewClient data={bullmqResult.value} />
    ) : (
      (() => {
        console.error("[JobsPage] Failed to load BullMQ data:", bullmqResult.reason);
        return <BullMQError message={messages.bullmqError} />;
      })()
    );

  const cronSection =
    cronResult.status === "fulfilled" ? (
      <CronRunsSection data={cronResult.value} />
    ) : (
      (() => {
        console.error("[JobsPage] Failed to load cron-runs data:", cronResult.reason);
        return <CronError message={messages.cronError} />;
      })()
    );

  return (
    <div className="space-y-8">
      {bullmqSection}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{messages.cronHeading}</h2>
            <p className="text-xs text-muted-foreground">
              {messages.cronDescription}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/system/jobs/history">
              <History className="size-4 mr-2" />
              {messages.viewHistory}
            </Link>
          </Button>
        </div>
        {cronSection}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JobsPage() {
  await requireAdminUser();
  const t = await getTranslations("system_jobs");

  const messages: JobsMessages = {
    bullmqError: t("page.errors.bullmqLoad"),
    cronError: t("page.errors.cronLoad"),
    cronHeading: t("page.cronSection.heading"),
    cronDescription: t("page.cronSection.description"),
    viewHistory: t("page.cronSection.viewHistory"),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("page.title")}</h1>
          <p className="text-muted-foreground">{t("page.description")}</p>
        </div>
      </div>
      <Suspense fallback={<JobsOverviewSkeleton />}>
        <JobsContent messages={messages} />
      </Suspense>
    </div>
  );
}
