import { cn } from "@/lib/utils";

interface FolioPillProps {
  folio: string | null;
  className?: string;
}

/**
 * Renders a folio_referencia string in a monospace pill.
 * Shows "—" when folio is null (order still in en_revision).
 */
export function FolioPill({ folio, className }: FolioPillProps) {
  if (!folio) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>—</span>
    );
  }

  return (
    <span
      className={cn(
        "font-mono text-sm font-medium tracking-wider",
        className,
      )}
    >
      {folio}
    </span>
  );
}
