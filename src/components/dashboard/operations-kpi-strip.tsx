import { PAGE_ENTER_CLASSES, getStaggerStyle } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type OperationsKpiTone = "default" | "positive" | "warning";

export interface OperationsKpiItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  hintTone?: OperationsKpiTone;
}

interface OperationsKpiStripProps {
  heading: string;
  items: OperationsKpiItem[];
  visuallyHideHeading?: boolean;
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
        {items.map((item, index) => (
          <Card
            key={item.id}
            size="sm"
            className={cn(PAGE_ENTER_CLASSES, "gap-0 py-3.5")}
            style={getStaggerStyle(index)}
          >
            <CardContent className="space-y-1">
              <p className="font-medium text-muted-foreground text-xs">{item.label}</p>
              <p className="font-semibold text-2xl text-primary tabular-nums tracking-tight">
                {item.value}
              </p>
              <p
                className={cn(
                  "text-xs tabular-nums",
                  item.hintTone === "positive" && "text-primary",
                  item.hintTone === "warning" && "text-destructive",
                  (!item.hintTone || item.hintTone === "default") &&
                    "text-muted-foreground",
                )}
              >
                {item.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
