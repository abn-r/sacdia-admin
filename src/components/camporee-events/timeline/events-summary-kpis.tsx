"use client";

import * as React from "react";
import { Calendar, Layers, Activity, Pin } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CamporeeEventsData } from "@/lib/camporee-timeline/types";

interface Props {
  data: CamporeeEventsData;
}

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}

function Kpi({ icon, label, value, hint }: KpiProps) {
  return (
    <Card className="block gap-0 rounded-xl border-border/60 bg-card shadow-xs px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground">
        <span className="[&_svg]:size-3.5">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-[22px] font-bold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="text-[11.5px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

export function EventsSummaryKpis({ data }: Props) {
  const { summary } = data;
  const reusePct = summary.total ? Math.round((summary.fromCatalog / summary.total) * 100) : 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
      <Kpi
        icon={<Calendar />}
        label="Eventos del camporee"
        value={summary.total}
        hint={`${summary.published} publicados · ${summary.cancelled} cancelado${summary.cancelled === 1 ? "" : "s"}`}
      />
      <Kpi
        icon={<Activity />}
        label="Horas de contenido"
        value={`${summary.hoursOfContent}h`}
        hint={`a lo largo de ${data.days.length} días`}
      />
      <Kpi
        icon={<Layers />}
        label="Desde catálogo"
        value={
          <span>
            {summary.fromCatalog}
            <span className="text-[14px] text-muted-foreground/70 font-medium">/{summary.total}</span>
          </span>
        }
        hint={`${reusePct}% reutilizados`}
      />
      <Kpi
        icon={<Pin />}
        label="Sedes en uso"
        value={summary.venuesUsed}
        hint={`de ${data.venues.length} disponibles`}
      />
    </div>
  );
}
