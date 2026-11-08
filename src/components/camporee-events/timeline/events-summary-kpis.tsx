"use client";

import { useTranslations } from "next-intl";
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import type { CamporeeEventsData } from "@/lib/camporee-timeline/types";

interface Props {
  data: CamporeeEventsData;
}

export function EventsSummaryKpis({ data }: Props) {
  const t = useTranslations("camporeeEvents.timeline");
  const { summary } = data;
  const reusePct = summary.total ? Math.round((summary.fromCatalog / summary.total) * 100) : 0;
  return (
    <KpiStrip className="mb-4">
      <KpiStripItem
        label="Eventos del camporee"
        value={summary.total}
        subline={`${summary.published} publicados · ${summary.cancelled} cancelado${summary.cancelled === 1 ? "" : "s"}`}
        emphasis
      />
      <KpiStripItem
        label="Horas de contenido"
        value={`${summary.hoursOfContent}h`}
        subline={`a lo largo de ${data.days.length} días`}
      />
      <KpiStripItem
        label={t("fromCatalogLabel")}
        value={summary.fromCatalog}
        unit={`/${summary.total}`}
        subline={`${reusePct}% reutilizados`}
      />
      <KpiStripItem
        label="Sedes en uso"
        value={summary.venuesUsed}
        subline={`de ${data.venues.length} disponibles`}
      />
    </KpiStrip>
  );
}
