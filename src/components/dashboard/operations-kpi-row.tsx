import Link from "next/link";
import { OperationsMeter } from "@/components/dashboard/operations-meter";

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

const CARD = "flex h-full min-w-0 flex-col rounded-xl bg-card p-3 shadow-card sm:p-4";
const LINK_CARD =
  "outline-none transition-shadow duration-150 hover:shadow-card-hover focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none";

function KpiBody({ item }: { item: OperationsKpi }) {
  return (
    <>
      <p className="truncate text-muted-foreground text-sm">{item.label}</p>
      <p className="mt-1.5 font-semibold text-2xl tabular-nums tracking-tight">
        {item.value}
        {item.total ? (
          <span className="ml-1 font-normal text-base text-muted-foreground">{item.total}</span>
        ) : null}
      </p>
      <div className="mt-auto space-y-2 pt-3">
        {item.pct !== undefined ? <OperationsMeter pct={item.pct} /> : null}
        <p className="text-muted-foreground text-xs">{item.caption}</p>
      </div>
    </>
  );
}

export function OperationsKpiRow({ label, items }: OperationsKpiRowProps) {
  return (
    <section aria-label={label}>
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {items.map((item) => (
          <li key={item.id} data-kpi={item.id} className="flex">
            {item.href ? (
              <Link href={item.href} className={`${CARD} ${LINK_CARD} w-full`}>
                <KpiBody item={item} />
              </Link>
            ) : (
              <div className={`${CARD} w-full`}>
                <KpiBody item={item} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
