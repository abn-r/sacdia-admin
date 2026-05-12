"use client";

import { Activity, BarChart3, History, TrendingUp, Trophy } from "lucide-react";
import type { Unit } from "@/lib/api/units";
import { CompositionDonut } from "./composition-donut";
import { UnitRanking } from "./unit-ranking";
import { getTotalMembers } from "./helpers";
import type { ClubSectionRaw, SectionView } from "./types";

interface OverviewTabProps {
  sections: SectionView[];
  units: Unit[];
  sectionLookup: Map<number, ClubSectionRaw>;
  pendingRequests?: number | null;
}

export function ClubOverviewTab({
  sections,
  units,
  sectionLookup,
  pendingRequests,
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
        subtitle="Score compuesto (próximamente)"
      >
        <HealthPlaceholder sections={sections} pending={pendingRequests} />
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
        title="Asistencia mensual"
        subtitle="Últimos 12 sábados"
      >
        <Placeholder
          icon={<TrendingUp className="size-5" />}
          title="Sin agregación disponible"
          description="Conectar `weekly-records` para mostrar tendencias de asistencia."
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

function HealthPlaceholder({
  sections,
  pending,
}: {
  sections: SectionView[];
  pending?: number | null;
}) {
  const activeSections = sections.filter((s) => s.active).length;
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-4">
      <div className="relative grid h-24 w-24 place-items-center rounded-full border-[10px] border-muted text-center">
        <div>
          <div className="text-2xl font-extrabold leading-none tracking-tight text-foreground">
            —
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Salud
          </div>
        </div>
      </div>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p className="text-foreground">
          Aún no hay un score consolidado. Mientras tanto, estos son los
          indicadores duros del club:
        </p>
        <ul className="grid gap-1.5">
          <Row
            icon={<Activity className="size-3.5" />}
            label={`${activeSections} de ${sections.length || 3} secciones activas`}
          />
          <Row
            icon={<Trophy className="size-3.5" />}
            label={
              pending == null
                ? "Sin lectura de solicitudes pendientes"
                : `${pending} solicitudes pendientes`
            }
          />
          <Row
            icon={<BarChart3 className="size-3.5" />}
            label="Pendiente: definir cálculo de score 360°"
          />
        </ul>
      </div>
    </div>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs text-foreground">
      <span className="grid size-5 place-items-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      {label}
    </li>
  );
}

function Placeholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
      <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
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
      <Placeholder
        icon={<History className="size-5" />}
        title="Aún sin línea de tiempo"
        description="El backend todavía no expone eventos de auditoría (creación, cambios de director, investiduras). Cuando se publique, se renderizará aquí."
      />
    </section>
  );
}
