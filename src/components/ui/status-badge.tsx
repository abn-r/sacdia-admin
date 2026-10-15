import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, MinusCircle, XCircle, AlertTriangle, Info, Circle } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusIntent =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "primary"
  | "progress-1"
  | "progress-2"
  | "progress-3";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const intentToBadgeVariant: Record<StatusIntent, BadgeVariant> = {
  neutral: "outline",
  info: "outline",
  success: "outline",
  warning: "outline",
  destructive: "destructive",
  primary: "default",
  "progress-1": "outline",
  "progress-2": "outline",
  "progress-3": "outline",
};

// Crisp: frequent row-level states sit on a neutral pill; hue lives only in the icon.
const NEUTRAL_PILL = "border-border bg-background text-foreground dark:bg-input/30";

const intentClasses: Partial<Record<StatusIntent, string>> = {
  neutral: `${NEUTRAL_PILL} text-muted-foreground`,
  info: NEUTRAL_PILL,
  success: NEUTRAL_PILL,
  warning: NEUTRAL_PILL,
  primary: "border-transparent bg-primary-solid text-primary-foreground",
  "progress-1":
    "bg-[color-mix(in_srgb,var(--chart-1)_12%,transparent)] text-[var(--chart-1)] border-[color-mix(in_srgb,var(--chart-1)_25%,transparent)]",
  "progress-2":
    "bg-[color-mix(in_srgb,var(--chart-2)_12%,transparent)] text-[var(--chart-2)] border-[color-mix(in_srgb,var(--chart-2)_25%,transparent)]",
  "progress-3":
    "bg-[color-mix(in_srgb,var(--chart-3)_12%,transparent)] text-[var(--chart-3)] border-[color-mix(in_srgb,var(--chart-3)_25%,transparent)]",
};

const intentIconClasses: Partial<Record<StatusIntent, string>> = {
  info: "text-info",
  success: "text-[color-mix(in_oklch,var(--success),black_15%)] dark:text-success",
  warning: "text-[color-mix(in_oklch,var(--warning),black_25%)] dark:text-warning",
};

// Default icons per intent — ensures WCAG 1.4.1 (not color-only distinction)
const intentDefaultIcon: Partial<Record<StatusIntent, LucideIcon>> = {
  success: CheckCircle2,
  neutral: MinusCircle,
  destructive: XCircle,
  warning: AlertTriangle,
  info: Info,
  primary: Circle,
};

export interface StatusBadgeProps {
  intent: StatusIntent;
  label: string;
  /** Override the default icon. Pass `null` to suppress the default icon entirely. */
  icon?: LucideIcon | null;
  size?: "xs" | "sm" | "default";
  className?: string;
}

export function StatusBadge({
  intent,
  label,
  icon,
  size = "default",
  className,
}: StatusBadgeProps) {
  const variant = intentToBadgeVariant[intent];
  const intentClass = intentClasses[intent];

  // Resolve icon: explicit prop wins; null suppresses; undefined falls back to default
  const ResolvedIcon =
    icon === null
      ? null
      : icon !== undefined
        ? icon
        : (intentDefaultIcon[intent] ?? null);

  const iconSizeClass = size === "xs" || size === "sm" ? "size-3" : "size-3.5";

  return (
    <Badge
      variant={variant}
      className={cn(
        "gap-1",
        size === "xs" && "h-5 px-1.5 text-[10px]",
        size === "sm" && "h-5 px-2 text-xs",
        intentClass,
        className,
      )}
    >
      {ResolvedIcon && (
        <ResolvedIcon className={cn(iconSizeClass, "shrink-0", intentIconClasses[intent])} aria-hidden="true" />
      )}
      {label}
    </Badge>
  );
}
