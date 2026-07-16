import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MemberRankingScoreBadgeProps {
  score: number | null;
  className?: string;
}

/**
 * Composite score badge for section / member rankings.
 * Cutoffs: null → — | >= 85% high | >= 65% mid | < 65% low
 */
export function MemberRankingScoreBadge({
  score,
  className,
}: MemberRankingScoreBadgeProps) {
  if (score === null) {
    return (
      <Badge variant="outline" className={className}>
        —
      </Badge>
    );
  }

  const label = `${score.toFixed(1)}%`;

  if (score >= 85) {
    return (
      <Badge variant="default" className={cn("tabular-nums", className)}>
        {label}
      </Badge>
    );
  }

  if (score >= 65) {
    return (
      <Badge variant="secondary" className={cn("tabular-nums", className)}>
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={cn("tabular-nums", className)}>
      {label}
    </Badge>
  );
}
