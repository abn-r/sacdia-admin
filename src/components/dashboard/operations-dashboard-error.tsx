"use client";

import Link from "next/link";
import { AlertCircle, Key, ServerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";

type ErrorKind =
  | "auth"
  | "forbidden"
  | "bad-request"
  | "not-found"
  | "rate-limited"
  | "server";

function classifyError(error: ApiError): ErrorKind {
  if (error.status === 401) return "auth";
  if (error.status === 403) return "forbidden";
  if (error.status === 400) return "bad-request";
  if (error.status === 404) return "not-found";
  if (error.status === 429) return "rate-limited";
  return "server";
}

interface OperationsDashboardErrorProps {
  error: ApiError;
}

export function OperationsDashboardError({ error }: OperationsDashboardErrorProps) {
  const t = useTranslations("dashboardHub.operations.errors");
  const kind = classifyError(error);

  if (kind === "forbidden") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("forbiddenDescription")} />
        <EndpointErrorBanner state="forbidden" detail={error.message} />
      </div>
    );
  }

  if (kind === "not-found") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("notFoundDescription")} />
        <EndpointErrorBanner state="missing" detail={error.message} />
      </div>
    );
  }

  if (kind === "rate-limited") {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("rateLimitedDescription")} />
        <EndpointErrorBanner state="rate-limited" detail={error.message} />
      </div>
    );
  }

  const icon = kind === "auth" ? Key : kind === "bad-request" ? AlertCircle : ServerOff;

  const Icon = icon;
  const titleKey =
    kind === "auth"
      ? "authTitle"
      : kind === "bad-request"
        ? "badRequestTitle"
        : "serverTitle";
  const descriptionKey =
    kind === "auth"
      ? "authDescription"
      : kind === "bad-request"
        ? "badRequestDescription"
        : "serverDescription";

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t(descriptionKey)} />
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 size-5 text-destructive" aria-hidden />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="gap-1">
                {kind === "auth" && <Key className="size-3" aria-hidden />}
                {kind === "server" && <ServerOff className="size-3" aria-hidden />}
                {t(titleKey)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {kind === "auth" && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">{t("goToLogin")}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
