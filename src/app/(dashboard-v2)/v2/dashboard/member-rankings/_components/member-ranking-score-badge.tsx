import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRankingScoreBadgeProps {
  score: number | null;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders a colored Badge for a composite score percentage.
 *
 * Cutoffs (Q3):
 *   null       → outline "—"
 *   >= 85%     → success
 *   >= 65%     → warning
 *   < 65%      → destructive
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

  if (score >= 85) {
    return (
      <Badge variant="success" className={className}>
        {score.toFixed(1)}%
      </Badge>
    );
  }

  if (score >= 65) {
    return (
      <Badge variant="warning" className={className}>
        {score.toFixed(1)}%
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={className}>
      {score.toFixed(1)}%
    </Badge>
  );
}
