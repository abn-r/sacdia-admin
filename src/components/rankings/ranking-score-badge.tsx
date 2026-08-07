import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface RankingScoreBadgeProps {
  value: number; // 0..100 expected
  className?: string;
}

/**
 * Displays a percentage score with a color-coded Badge variant:
 *   >= 80  → success (green)
 *   >= 60  → soft-warning (amber)
 *    < 60  → destructive (red)
 */
export function RankingScoreBadge({ value, className }: RankingScoreBadgeProps) {
  const variant =
    value >= 80 ? "success" : value >= 60 ? "soft-warning" : "destructive";

  return (
    <Badge
      variant={variant}
      className={cn("font-mono tabular-nums", className)}
    >
      {value.toFixed(1)}%
    </Badge>
  );
}
