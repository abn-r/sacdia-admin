"use client";

import Link from "next/link";
import { AlertCircle, ShieldOff, Clock, ServerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EndpointState = "forbidden" | "missing" | "rate-limited";
type ErrorBannerLabelKey = "forbidden" | "missing" | "rateLimited";

const stateConfig: Record<EndpointState, { icon: React.ElementType; labelKey: ErrorBannerLabelKey; variant: "destructive" | "secondary" | "outline" }> = {
  forbidden: { icon: ShieldOff, labelKey: "forbidden", variant: "destructive" },
  missing: { icon: ServerOff, labelKey: "missing", variant: "secondary" },
  "rate-limited": { icon: Clock, labelKey: "rateLimited", variant: "outline" },
};

interface EndpointErrorBannerProps {
  state: EndpointState;
  detail: string;
  showLoginLink?: boolean;
}

export function EndpointErrorBanner({ state, detail, showLoginLink }: EndpointErrorBannerProps) {
  const t = useTranslations("shared.errorBanner");
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 text-destructive" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={config.variant} className="gap-1">
              <Icon className="size-3" />
              {t(config.labelKey)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{detail}</p>
          {showLoginLink && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">{t("goToLogin")}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
