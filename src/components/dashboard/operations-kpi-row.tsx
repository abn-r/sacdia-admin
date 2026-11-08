import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import { progressTone } from "@/lib/dashboard/operations-home";

export type OperationsKpi = {
  id: string;
  label: string;
  /** Already formatted; "—" when unknown. */
  value: string;
  /** Muted denominator printed after the value ("/ 12"). */
  total?: string;
  caption: string;
  /** When present (even `null`), a progress bar is drawn. */
  pct?: number | null;
  href?: string;
};

export interface OperationsKpiRowProps {
  label: string;
  items: OperationsKpi[];
}

export function OperationsKpiRow({ label, items }: OperationsKpiRowProps) {
  return (
    <section aria-label={label}>
      <KpiStrip>
        {items.map((item) => {
          const tone = item.pct !== undefined ? progressTone(item.pct) : "none";
          return (
            <KpiStripItem
              key={item.id}
              data-kpi={item.id}
              label={item.label}
              value={item.value}
              unit={item.total}
              subline={item.caption}
              href={item.href}
              meter={
                item.pct !== undefined
                  ? {
                      value: item.pct,
                      tone: tone === "none" ? "neutral" : tone,
                    }
                  : undefined
              }
            />
          );
        })}
      </KpiStrip>
    </section>
  );
}
