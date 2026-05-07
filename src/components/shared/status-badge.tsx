import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusIntent =
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "neutral"
  | "secondary";

interface StatusBadgeProps {
  intent: StatusIntent;
  children: React.ReactNode;
  className?: string;
}

const intentVariantMap: Record<
  StatusIntent,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  success: "success",
  warning: "warning",
  info: "soft-info",
  destructive: "destructive",
  neutral: "outline",
  secondary: "secondary",
};

export function StatusBadge({ intent, children, className }: StatusBadgeProps) {
  return (
    <Badge variant={intentVariantMap[intent]} className={cn(className)}>
      {children}
    </Badge>
  );
}
