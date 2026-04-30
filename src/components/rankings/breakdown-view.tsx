import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankingScoreBadge } from "@/components/rankings/ranking-score-badge";
import type {
  RankingBreakdown,
  RankingBreakdownCamporeeEvent,
} from "@/lib/api/annual-folders";

// ─── Sub-components ───────────────────────────────────────────────────────────

function WeightsCard({
  weights,
}: {
  weights: RankingBreakdown["weights_applied"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pesos aplicados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div className="text-muted-foreground">
          Fuente:{" "}
          <span className="text-foreground font-medium">
            {weights.source === "default"
              ? "Default global"
              : "Override por tipo de club"}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>Carpetas: {weights.folder}%</span>
          <span>Finanzas: {weights.finance}%</span>
          <span>Camporees: {weights.camporee}%</span>
          <span>Evidencias: {weights.evidence}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CamporeeEventList({
  events,
}: {
  events: RankingBreakdownCamporeeEvent[];
}) {
  if (events.length === 0) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
      {events.map((e) => (
        <li key={e.id} className="flex items-center gap-1.5">
          <span
            className={
              e.status === "approved" ? "text-success" : "text-muted-foreground"
            }
          >
            {e.status === "approved" ? "✓" : "—"}
          </span>
          {e.name}
        </li>
      ))}
    </ul>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: RankingBreakdown;
}

export function BreakdownView({ data }: Props) {
  const { components: c, weights_applied } = data;

  return (
    <div className="space-y-6">
      {/* Composite header */}
      <div className="flex items-center gap-3">
        <RankingScoreBadge value={data.composite_score_pct} className="text-lg px-3 py-1" />
        <span className="text-sm text-muted-foreground">
          Puntaje compuesto institucional
        </span>
      </div>

      {/* Four component cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Carpetas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Carpetas
              <RankingScoreBadge value={c.folder.score_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              {c.folder.earned_points} / {c.folder.max_points} puntos
            </div>
            <div className="text-muted-foreground">
              {c.folder.sections_evaluated} secciones evaluadas
            </div>
          </CardContent>
        </Card>

        {/* Finanzas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Finanzas
              <RankingScoreBadge value={c.finance.score_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              {c.finance.months_closed_on_time} / {c.finance.months_total}{" "}
              meses cerrados a tiempo
            </div>
            <div className="text-muted-foreground">
              Deadline: día {c.finance.deadline_day} del mes siguiente
            </div>
            {c.finance.missed_months.length > 0 && (
              <div className="text-destructive text-xs">
                Meses faltantes: {c.finance.missed_months.join(", ")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Camporees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Camporees
              <RankingScoreBadge value={c.camporee.score_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div>
              {c.camporee.attended} / {c.camporee.available_in_scope} eventos
              del scope
            </div>
            <CamporeeEventList events={c.camporee.events} />
          </CardContent>
        </Card>

        {/* Evidencias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Evidencias
              <RankingScoreBadge value={c.evidence.score_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              {c.evidence.validated} validadas / {c.evidence.rejected}{" "}
              rechazadas
            </div>
            <div className="text-xs text-muted-foreground">
              {c.evidence.pending_excluded} pendientes (excluidas del cálculo)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weights */}
      <WeightsCard weights={weights_applied} />
    </div>
  );
}
