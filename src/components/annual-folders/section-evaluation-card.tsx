"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  SectionEvaluation,
  SectionEvaluationStatus,
  UnionDecision,
} from "@/lib/api/annual-folders";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  variant: "outline" | "secondary" | "warning" | "success" | "destructive";
};

const STATUS_CONFIG: Record<SectionEvaluationStatus, StatusConfig> = {
  PENDING: { label: "Pendiente", variant: "outline" },
  SUBMITTED: { label: "Enviado", variant: "secondary" },
  PREAPPROVED_LF: { label: "Preaprobado", variant: "warning" },
  VALIDATED: { label: "Validado", variant: "success" },
  REJECTED: { label: "Rechazado", variant: "destructive" },
};

interface SectionStatusBadgeProps {
  status: SectionEvaluationStatus;
  className?: string;
}

export function SectionStatusBadge({
  status,
  className,
}: SectionStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "outline" as const,
  };
  return (
    <Badge variant={config.variant} className={cn("text-xs", className)}>
      {config.label}
    </Badge>
  );
}

// ─── Union decision badge ──────────────────────────────────────────────────────

interface UnionDecisionBadgeProps {
  decision: UnionDecision;
}

function UnionDecisionBadge({ decision }: UnionDecisionBadgeProps) {
  if (!decision || decision === "APPROVED") return null;
  return (
    <Badge variant="destructive" className="text-xs">
      Rechazo por unión
    </Badge>
  );
}

// ─── Actor row ─────────────────────────────────────────────────────────────────

interface ActorRowProps {
  label: string;
  name: string | null | undefined;
  approvedAt: string | null | undefined;
  decision?: UnionDecision;
}

function ActorRow({ label, name, approvedAt, decision }: ActorRowProps) {
  if (!name) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      <span className="font-medium text-foreground">{label}:</span>
      <span className="text-muted-foreground">
        {name}
        {approvedAt ? ` · ${formatShortDate(approvedAt)}` : ""}
      </span>
      {decision !== undefined && <UnionDecisionBadge decision={decision} />}
    </div>
  );
}

// ─── Section Evaluation Card ──────────────────────────────────────────────────

interface SectionEvaluationCardProps {
  evaluation: SectionEvaluation;
  sectionName?: string;
  maxPoints?: number;
  className?: string;
}

export function SectionEvaluationCard({
  evaluation,
  sectionName,
  maxPoints,
  className,
}: SectionEvaluationCardProps) {
  const effectiveMax = maxPoints ?? evaluation.max_points;
  const pct =
    effectiveMax > 0
      ? Math.round((evaluation.earned_points / effectiveMax) * 100)
      : 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-4 py-3 space-y-2",
        className,
      )}
    >
      {/* Header: section name + status pill */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {sectionName && (
          <span className="text-sm font-medium truncate">{sectionName}</span>
        )}
        <SectionStatusBadge status={evaluation.status} />
      </div>

      {/* Score line */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold tabular-nums">
          {evaluation.earned_points}
          <span className="font-normal text-muted-foreground">
            {" "}/ {effectiveMax} pts
          </span>
        </span>
        <span className="text-xs text-muted-foreground">({pct}%)</span>
      </div>

      {/* Actor rows */}
      <div className="space-y-0.5">
        <ActorRow
          label="LF"
          name={evaluation.lf_approver?.name}
          approvedAt={evaluation.lf_approved_at}
        />
        <ActorRow
          label="Unión"
          name={evaluation.union_approver?.name}
          approvedAt={evaluation.union_approved_at}
          decision={evaluation.union_decision}
        />
      </div>

      {/* Notes */}
      {evaluation.notes && (
        <p className="rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
          {evaluation.notes}
        </p>
      )}
    </div>
  );
}
