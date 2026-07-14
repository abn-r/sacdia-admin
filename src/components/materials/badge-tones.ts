import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function toneBadgeProps(
  tone: "success" | "warning" | "neutral" | "danger",
): { variant: BadgeVariant; className?: string } {
  switch (tone) {
    case "success":
      return {
        variant: "outline",
        className:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
      };
    case "warning":
      return {
        variant: "outline",
        className:
          "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      };
    case "danger":
      return { variant: "destructive" };
    default:
      return { variant: "secondary" };
  }
}
