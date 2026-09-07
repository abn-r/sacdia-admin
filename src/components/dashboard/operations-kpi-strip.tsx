import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type OperationsKpiTone = "default" | "positive" | "warning";

export interface OperationsKpiItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  hintTone?: OperationsKpiTone;
  href?: string;
}

interface OperationsKpiStripProps {
  heading: string;
  items: OperationsKpiItem[];
  visuallyHideHeading?: boolean;
}

const PRESSABLE =
  "block rounded-2xl outline-none transition-transform duration-150 ease-[var(--ease-out-expo)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:ring-[3px] focus-visible:ring-ring/50";

function KpiCard({ item }: { item: OperationsKpiItem }) {
  return (
    <Card size="sm" className="gap-0 py-3.5">
      <CardContent className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-muted-foreground text-xs">{item.label}</p>
          {item.href ? (
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : null}
        </div>
        <p className="font-semibold text-2xl text-primary tabular-nums tracking-tight">
          {item.value}
        </p>
        <p
          className={cn(
            "text-xs tabular-nums",
            item.hintTone === "positive" && "text-primary",
            item.hintTone === "warning" && "text-destructive",
            (!item.hintTone || item.hintTone === "default") && "text-muted-foreground",
          )}
        >
          {item.hint}
        </p>
      </CardContent>
    </Card>
  );
}

export function OperationsKpiStrip({
  heading,
  items,
  visuallyHideHeading = false,
}: OperationsKpiStripProps) {
  return (
    <section aria-labelledby="operations-kpis">
      <h2
        id="operations-kpis"
        className={
          visuallyHideHeading
            ? "sr-only"
            : "mb-3 font-medium text-foreground text-sm"
        }
      >
        {heading}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) =>
          item.href ? (
            <Link key={item.id} href={item.href} className={PRESSABLE} aria-label={item.label}>
              <KpiCard item={item} />
            </Link>
          ) : (
            <KpiCard key={item.id} item={item} />
          ),
        )}
      </div>
    </section>
  );
}
