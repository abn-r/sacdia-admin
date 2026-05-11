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
  info: "soft-info",
  success: "soft-success",
  warning: "soft-warning",
  destructive: "destructive",
  primary: "soft",
  "progress-1": "outline",
  "progress-2": "outline",
  "progress-3": "outline",
};

const progressClasses: Partial<Record<StatusIntent, string>> = {
  "progress-1":
    "bg-[color-mix(in_oklch,var(--chart-1)_12%,transparent)] text-[var(--chart-1)] border-[color-mix(in_oklch,var(--chart-1)_25%,transparent)]",
  "progress-2":
    "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)] border-[color-mix(in_oklch,var(--chart-2)_25%,transparent)]",
  "progress-3":
    "bg-[color-mix(in_oklch,var(--chart-3)_12%,transparent)] text-[var(--chart-3)] border-[color-mix(in_oklch,var(--chart-3)_25%,transparent)]",
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
  const progressClass = progressClasses[intent];

  // Resolve icon: explicit prop wins; null suppresses; undefined falls back to default
  const ResolvedIcon =
    icon === null
      ? null
      : icon !== undefined
        ? icon
        : (intentDefaultIcon[intent] ?? null);

  return (
    <Badge
      variant={variant}
      className={cn(
        "gap-1",
        size === "xs" && "h-5 px-1.5 text-[10px]",
        size === "sm" && "h-5 px-2 text-xs",
        progressClass,
        className,
      )}
    >
      {ResolvedIcon && <ResolvedIcon className="mr-1 size-3.5 shrink-0" />}
      {label}
    </Badge>
  );
}
