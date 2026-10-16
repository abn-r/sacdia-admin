"use client";

import Link from "next/link";
import { ShieldOff, Clock, ServerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EndpointState = "forbidden" | "missing" | "rate-limited";
type ErrorBannerLabelKey = "forbidden" | "missing" | "rateLimited";

const stateConfig: Record<
  EndpointState,
  { icon: React.ElementType; labelKey: ErrorBannerLabelKey; tone: "destructive" | "warning" }
> = {
  forbidden: { icon: ShieldOff, labelKey: "forbidden", tone: "destructive" },
  missing: { icon: ServerOff, labelKey: "missing", tone: "destructive" },
  "rate-limited": { icon: Clock, labelKey: "rateLimited", tone: "warning" },
};

interface EndpointErrorBannerProps {
  state: EndpointState;
  detail: string;
  showLoginLink?: boolean;
}

/**
 * Inline page-level error. Crisp: the state reads as a short title, the detail
 * (what actually happened) sits right under it; hue only on the icon and a
 * faint tint, no badge.
 */
export function EndpointErrorBanner({ state, detail, showLoginLink }: EndpointErrorBannerProps) {
  const t = useTranslations("shared.errorBanner");
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        config.tone === "destructive"
          ? "border-destructive/25 bg-destructive/5"
          : "border-warning/40 bg-warning/10",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          config.tone === "destructive"
            ? "text-destructive"
            : "text-[color-mix(in_oklch,var(--warning),black_25%)] dark:text-warning",
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium text-foreground">{t(config.labelKey)}</p>
        <p className="text-muted-foreground">{detail}</p>
        {showLoginLink && (
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/login">{t("goToLogin")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
