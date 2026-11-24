import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** Soft semantic tones (tokens only, so dark mode follows the theme). */
export function toneBadgeProps(
  tone: "success" | "warning" | "neutral" | "danger",
): { variant: BadgeVariant; className?: string } {
  switch (tone) {
    case "success":
      return {
        variant: "outline",
        className: "border-success/25 bg-success/10 text-success-foreground",
      };
    case "warning":
      return {
        variant: "outline",
        className: "border-warning/25 bg-warning/10 text-warning-foreground",
      };
    case "danger":
      return { variant: "destructive" };
    default:
      return { variant: "secondary" };
  }
}
