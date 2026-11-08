import type { ReactNode } from "react";
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";

export interface StatItem {
  label: string;
  value: ReactNode;
  sub?: string;
  /** Extra plain-text line (no icons). */
  accent?: ReactNode;
}

export function UserDetailStats({ items }: { items: StatItem[] }) {
  if (items.length === 0) return null;
  return (
    <KpiStrip>
      {items.map((it) => (
        <KpiStripItem
          key={String(it.label)}
          label={it.label}
          value={it.value}
          subline={
            it.sub || it.accent ? (
              <>
                {it.sub}
                {it.sub && it.accent ? <br /> : null}
                {it.accent}
              </>
            ) : undefined
          }
        />
      ))}
    </KpiStrip>
  );
}
