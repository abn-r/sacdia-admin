"use client";

import { cn } from "@/lib/utils";
import type {
  AttendanceDataPoint,
  ClubScore,
  ScoreBreakdownItem,
} from "@/lib/api/club-detail";

interface AttendanceChartProps {
  series: AttendanceDataPoint[];
}

export function AttendanceChart({ series }: AttendanceChartProps) {
  if (series.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay registros semanales de asistencia para graficar.
      </p>
    );
  }

  const totalSlots = Math.max(series.length, 12);
  const padded = [...series];
  while (padded.length < totalSlots) {
    padded.unshift({ year: 0, week: 0, avg_pct: 0 });
  }
  const recentCutoff = padded.length - 3;
  const max = Math.max(100, ...padded.map((p) => p.avg_pct));

  return (
    <div>
      <div className="relative h-32">
        <div aria-hidden className="absolute inset-0 grid grid-rows-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-t border-dashed border-border" />
          ))}
        </div>
        <div className="absolute inset-0 flex items-end gap-1">
          {padded.map((p, i) => {
            const heightPct = (p.avg_pct / max) * 100;
            const empty = p.year === 0 && p.week === 0;
            const recent = i >= recentCutoff;
            return (
              <div
                key={`${p.year}-${p.week}-${i}`}
                className={cn(
                  "flex-1 rounded-t-md",
                  empty
                    ? "bg-muted/40"
                    : recent
                      ? "bg-gradient-to-b from-primary to-primary/70"
                      : "bg-primary/30",
                )}
                style={{ height: `${Math.max(empty ? 0 : 4, heightPct)}%` }}
                title={empty ? "Sin datos" : `${p.avg_pct}%`}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-12 gap-1 font-mono text-[10px] text-muted-foreground">
        {padded.slice(-12).map((p, i) => (
          <span key={i} className="text-center tabular-nums">
            {p.year === 0 ? "—" : `S${p.week}`}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ScoreCircleProps {
  score: ClubScore;
}

export function ScoreCircle({ score }: ScoreCircleProps) {
  const value = Math.max(0, Math.min(100, score.value));
  const R = 40;
  const C = 2 * Math.PI * R;
  const dash = (value / 100) * C;

  const tone = value >= 75 ? "success" : value >= 50 ? "warning" : "destructive";
  const stroke =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-destructive)";

  return (
    <div className="relative h-24 w-24">
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="10"
        />
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xl font-extrabold leading-none tracking-tight text-foreground">
            {Math.round(value)}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {score.grade}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScoreBreakdownProps {
  items: ScoreBreakdownItem[];
}

export function ScoreBreakdown({ items }: ScoreBreakdownProps) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Score sin componentes — sin agregados disponibles.
      </p>
    );
  }
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="text-foreground">{item.label}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {Math.round(item.value_pct)}% · w{(item.weight * 100).toFixed(0)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, item.value_pct)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
