import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon | ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /**
   * "default"    — standard empty (no data at all). Icon container uses bg-muted.
   * "no-results" — filtered query returned nothing. Icon container uses bg-muted/40.
   *
   * @default "default"
   */
  variant?: "default" | "no-results";
}

function renderIcon(icon: LucideIcon | ReactNode): ReactNode {
  if (typeof icon === "function") {
    const Icon = icon as LucideIcon;
    return <Icon className="size-6 text-muted-foreground" aria-hidden="true" />;
  }
  return icon;
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          variant === "no-results" ? "bg-muted/40" : "bg-muted",
        )}
      >
        {renderIcon(icon)}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
