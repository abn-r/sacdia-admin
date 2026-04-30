import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MemberRankingScoreBadge } from "@/app/(dashboard)/dashboard/member-rankings/_components/member-ranking-score-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberBreakdownCardProps {
  title: string;
  score: number | null;
  weight: number;
  breakdown: ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Pure server component. Renders a single signal card (class / investiture /
 * camporee) with a progress bar, score badge, weight pill, and slot for
 * the signal-specific breakdown detail.
 */
export function MemberBreakdownCard({
  title,
  score,
  weight,
  breakdown,
}: MemberBreakdownCardProps) {
  const progressValue = score !== null ? Math.min(100, Math.max(0, score)) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Peso: {weight}%
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score badge + progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Puntuación</span>
            <MemberRankingScoreBadge score={score} />
          </div>
          <Progress value={progressValue} />
        </div>

        {/* Signal-specific breakdown slot */}
        <div className="space-y-1 text-sm text-muted-foreground">
          {breakdown}
        </div>
      </CardContent>
    </Card>
  );
}
