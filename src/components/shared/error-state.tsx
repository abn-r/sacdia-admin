"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  Copy,
  Lock,
  RefreshCw,
  Search,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import type { ErrorStateDetail, ErrorStateKind } from "@/lib/api/error-state";
import { cn } from "@/lib/utils";

export type { ErrorStateDetail, ErrorStateKind };

export interface ErrorStateProps {
  /** @default "error" */
  kind?: ErrorStateKind;
  /** `page` is centered with actions; `inline` is a one-line message. @default "page" */
  variant?: "page" | "inline";
  /** Contextual domain icon (e.g. the icon of the block that failed). */
  icon?: LucideIcon;
  /** Overrides the per-kind title. */
  title?: string;
  /** Overrides the per-kind description. */
  description?: string;
  /** Custom retry handler. Takes precedence over `retry`. */
  onRetry?: () => void;
  /** `true` re-runs the server render with `router.refresh()`. */
  retry?: boolean;
  /** Technical detail shown as a muted line plus "Copiar detalle". Ignored for `rateLimited`. */
  detail?: ErrorStateDetail;
  /** Extra actions (page variant), e.g. "Ir al inicio". */
  actions?: ReactNode;
  className?: string;
}

const KIND_ICON: Record<Exclude<ErrorStateKind, "error">, LucideIcon> = {
  forbidden: Lock,
  offline: WifiOff,
  rateLimited: Clock,
  notFound: Search,
};

const KIND_COPY: Record<
  ErrorStateKind,
  | { title: "title"; description: "description" }
  | { title: `${string}Title`; description: `${string}Description` }
> = {
  error: { title: "title", description: "description" },
  forbidden: { title: "forbiddenTitle", description: "forbiddenDescription" },
  offline: { title: "offlineTitle", description: "offlineDescription" },
  rateLimited: { title: "rateLimitedTitle", description: "rateLimitedDescription" },
  notFound: { title: "notFoundTitle", description: "notFoundDescription" },
};

function useErrorStateModel(props: ErrorStateProps) {
  const { kind = "error", onRetry, retry, detail } = props;
  const t = useTranslations("shared.kit.errorState");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const copy = KIND_COPY[kind];
  const title =
    props.title ?? t(copy.title as Parameters<typeof t>[0]);
  const description =
    props.description ?? t(copy.description as Parameters<typeof t>[0]);

  const handleRetry = onRetry
    ? () => onRetry()
    : retry
      ? () => startTransition(() => router.refresh())
      : undefined;

  const showDetail = detail !== undefined && kind !== "rateLimited";
  const at = detail?.at !== undefined ? new Date(detail.at) : undefined;
  const time =
    at && !Number.isNaN(at.getTime())
      ? format.dateTime(at, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: SACDIA_DISPLAY_TIMEZONE,
        })
      : undefined;
  const detailLine =
    showDetail && detail?.code !== undefined && time
      ? t("detail", { code: detail.code, time })
      : undefined;

  async function copyDetail() {
    if (!detail) return;
    const lines = [
      detail.code !== undefined ? `code: ${detail.code}` : null,
      at && !Number.isNaN(at.getTime()) ? `at: ${at.toISOString()}` : null,
      detail.ref ? `ref: ${detail.ref}` : null,
      `path: ${window.location.pathname}`,
    ].filter((line): line is string => line !== null);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success(t("copied"));
    } catch {
      // Clipboard unavailable: nothing to confirm.
    }
  }

  return {
    kind,
    t,
    title,
    description,
    handleRetry,
    pending,
    showCopy: showDetail,
    detailLine,
    copyDetail,
  };
}

const ALERT_KINDS: ReadonlySet<ErrorStateKind> = new Set(["error", "offline", "rateLimited"]);

function roleFor(kind: ErrorStateKind) {
  return ALERT_KINDS.has(kind) ? "alert" : "status";
}

/**
 * Failed-load state in the style of the app's `SacErrorState`: icon, short title,
 * one sentence of what to do, actions. No box or border. Use `variant="inline"`
 * for a one-line message inside a block, and `ErrorStateTableRow` inside a table.
 */
export function ErrorState(props: ErrorStateProps) {
  const { variant = "page", icon, actions, className } = props;
  const m = useErrorStateModel(props);
  const { kind } = m;

  if (variant === "inline") {
    const Icon = icon ?? (kind === "error" ? AlertTriangle : KIND_ICON[kind]);
    return (
      <div
        role={roleFor(kind)}
        data-slot="error-state"
        data-kind={kind}
        data-variant="inline"
        className={cn(
          "flex items-center gap-2.5 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden />
        <span>{props.title ?? props.description ?? m.title}</span>
        {m.handleRetry && (
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-auto p-0 font-medium no-underline hover:underline"
            loading={m.pending}
            onClick={m.handleRetry}
          >
            {m.t("retry")}
          </Button>
        )}
      </div>
    );
  }

  let visual: ReactNode;
  if (kind === "error" && icon) {
    const Icon = icon;
    visual = (
      <span className="relative inline-grid">
        <Icon className="size-11 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <span
          data-slot="error-state-badge"
          className="absolute -right-1.5 -bottom-1 grid size-5 place-items-center rounded-full border-2 border-background bg-destructive-solid text-destructive-foreground"
        >
          <X className="size-[11px]" strokeWidth={2.4} aria-hidden />
        </span>
      </span>
    );
  } else if (kind === "error") {
    visual = <AlertTriangle className="size-12 text-destructive" strokeWidth={1.5} aria-hidden />;
  } else {
    const Icon = icon ?? KIND_ICON[kind];
    visual = <Icon className="size-12 text-muted-foreground" strokeWidth={1.5} aria-hidden />;
  }

  const hasActions = m.handleRetry || m.showCopy || actions;

  return (
    <div
      role={roleFor(kind)}
      data-slot="error-state"
      data-kind={kind}
      data-variant="page"
      className={cn("flex flex-col items-center px-6 py-12 text-center", className)}
    >
      {visual}
      <h3 className="mt-3.5 text-base font-semibold tracking-tight">{m.title}</h3>
      <p className="mt-1.5 max-w-[440px] text-sm text-muted-foreground">{m.description}</p>
      {hasActions && (
        <div className="mt-[18px] flex flex-wrap items-center justify-center gap-2">
          {m.handleRetry && (
            <Button type="button" loading={m.pending} onClick={m.handleRetry}>
              <RefreshCw aria-hidden />
              {m.t("retry")}
            </Button>
          )}
          {m.showCopy && (
            <Button type="button" variant="ghost" onClick={m.copyDetail}>
              <Copy aria-hidden />
              {m.t("copyDetail")}
            </Button>
          )}
          {actions}
        </div>
      )}
      {m.detailLine && (
        <p className="mt-3 text-xs text-muted-foreground tabular-nums">{m.detailLine}</p>
      )}
    </div>
  );
}

export interface ErrorStateTableRowProps extends Omit<ErrorStateProps, "variant"> {
  colSpan: number;
}

/**
 * Error inside the table frame (keeps the column headers): one row whose single
 * cell spans every column and wraps text (table cells are nowrap by default).
 */
export function ErrorStateTableRow({ colSpan, ...props }: ErrorStateTableRowProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0 whitespace-normal">
        <ErrorState {...props} variant="page" />
      </TableCell>
    </TableRow>
  );
}
