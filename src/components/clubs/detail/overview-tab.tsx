"use client";

import { History, Loader2, TrendingUp } from "lucide-react";
import type { Unit } from "@/lib/api/units";
import type { ClubOverview } from "@/lib/api/club-detail";
import { CompositionDonut } from "./composition-donut";
import { UnitRanking } from "./unit-ranking";
import { AttendanceChart, ScoreBreakdown, ScoreCircle } from "./charts";
import { getTotalMembers } from "./helpers";
import type { ClubSectionRaw, SectionView } from "./types";

interface OverviewTabProps {
  sections: SectionView[];
  units: Unit[];
  sectionLookup: Map<number, ClubSectionRaw>;
  overview: ClubOverview | undefined;
  isLoadingOverview: boolean;
  overviewError: Error | null;
}

export function ClubOverviewTab({
  sections,
  units,
  sectionLookup,
  overview,
  isLoadingOverview,
  overviewError,
}: OverviewTabProps) {
  const total = getTotalMembers(sections);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
      <PanelCard
        className="lg:col-span-7"
        title="Composición del club"
        subtitle="Distribución de miembros entre las tres secciones"
        right={
          <span className="text-[11px] text-muted-foreground">
            Total · {total}
          </span>
        }
      >
        <CompositionDonut sections={sections} total={total} />
      </PanelCard>

      <PanelCard
        className="lg:col-span-5"
        title="Salud del club"
        subtitle="Score compuesto"
      >
        <HealthBlock
          overview={overview}
          isLoading={isLoadingOverview}
          error={overviewError}
        />
      </PanelCard>

      <PanelCard
        className="lg:col-span-7"
        title="Ranking de unidades"
        subtitle="Por tamaño · todas las secciones"
        right={
          <span className="text-[11px] text-muted-foreground">
            {units.length} unidades
          </span>
        }
      >
        <UnitRanking units={units} sectionLookup={sectionLookup} limit={8} />
      </PanelCard>

      <PanelCard
        className="lg:col-span-5"
        title="Asistencia semanal"
        subtitle="Promedio % por semana"
        right={
          overview?.attendance_average != null && (
            <span className="text-[11px] text-muted-foreground">
              Promedio ·{" "}
              <b className="text-foreground">
                {Math.round(overview.attendance_average)}%
              </b>
            </span>
          )
        }
      >
        <AttendanceBlock
          overview={overview}
          isLoading={isLoadingOverview}
          error={overviewError}
        />
      </PanelCard>
    </div>
  );
}

function PanelCard({
  className = "",
  title,
  subtitle,
  right,
  children,
}: {
  className?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border bg-card p-5 shadow-sm ${className}`}>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function HealthBlock({
  overview,
  isLoading,
  error,
}: {
  overview: ClubOverview | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) return <CardLoader />;
  if (error || !overview) {
    return (
      <p className="text-sm text-muted-foreground">
        No se pudo cargar el score del club.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[96px_1fr] items-center gap-4">
        <ScoreCircle score={overview.score} />
        <p className="text-xs text-muted-foreground">
          Score compuesto basado en asistencia, secciones activas y ocupación de
          cupo. Grado actual:{" "}
          <span className="font-semibold text-foreground">
            {overview.score.grade}
          </span>
          .
        </p>
      </div>
      <ScoreBreakdown items={overview.score.breakdown} />
    </div>
  );
}

function AttendanceBlock({
  overview,
  isLoading,
  error,
}: {
  overview: ClubOverview | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  if (isLoading) return <CardLoader />;
  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        No se pudo cargar la serie de asistencia.
      </p>
    );
  }
  if (!overview?.attendance || overview.attendance.length === 0) {
    return (
      <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
        <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <TrendingUp className="size-5" />
        </span>
        <p className="text-sm font-semibold text-foreground">
          Sin registros semanales todavía
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Cuando se capturen `weekly-records`, aquí aparecerá la tendencia de
          asistencia.
        </p>
      </div>
    );
  }
  return <AttendanceChart series={overview.attendance} />;
}

function CardLoader() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Cargando…
    </div>
  );
}

export function ClubHistoryPlaceholder() {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-sm font-bold text-foreground">Historial del club</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Eventos importantes desde la creación
        </p>
      </header>
      <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
        <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <History className="size-5" />
        </span>
        <p className="text-sm font-semibold text-foreground">
          Aún sin línea de tiempo
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          El backend todavía no expone eventos de auditoría (creación, cambios
          de director, investiduras). Cuando se publique, se renderizará aquí.
        </p>
      </div>
    </section>
  );
}
