import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
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

export interface StatusBadgeProps {
  intent: StatusIntent;
  label: string;
  icon?: LucideIcon;
  size?: "xs" | "sm" | "default";
  className?: string;
}

export function StatusBadge({
  intent,
  label,
  icon: Icon,
  size = "default",
  className,
}: StatusBadgeProps) {
  const variant = intentToBadgeVariant[intent];
  const progressClass = progressClasses[intent];

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
      {Icon && <Icon className="size-3 shrink-0" />}
      {label}
    </Badge>
  );
}
