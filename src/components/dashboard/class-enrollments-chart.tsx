"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { GraduationCap } from "lucide-react";
import type { ClassBreakdownItem } from "@/lib/api/operations-dashboard";
import { useFormatNumber } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

interface ClassEnrollmentsChartProps {
  items: ClassBreakdownItem[];
  showTable?: boolean;
  compact?: boolean;
}

const TYPE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

type ClassTypeGroup = {
  id: number;
  name: string;
  color: string;
  total: number;
  items: ClassBreakdownItem[];
};

function groupByClubType(items: ClassBreakdownItem[]): ClassTypeGroup[] {
  const groups: ClassTypeGroup[] = [];
  const indexByType = new Map<number, number>();

  for (const item of items) {
    const existing = indexByType.get(item.club_type_id);
    if (existing === undefined) {
      indexByType.set(item.club_type_id, groups.length);
      groups.push({
        id: item.club_type_id,
        name: item.club_type_name,
        color: TYPE_COLORS[groups.length % TYPE_COLORS.length],
        total: item.enrollment_count,
        items: [item],
      });
      continue;
    }

    groups[existing].items.push(item);
    groups[existing].total += item.enrollment_count;
  }

  return groups;
}

export function ClassEnrollmentsChart({
  items,
  showTable = true,
  compact = false,
}: ClassEnrollmentsChartProps) {
  const t = useTranslations("dashboardHub.operations.formation");
  const formatNumber = useFormatNumber();

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.display_order - b.display_order || a.class_id - b.class_id),
    [items],
  );

  const groups = useMemo(() => {
    const visible = compact
      ? sorted.filter((item) => item.enrollment_count > 0)
      : sorted;
    return groupByClubType(visible);
  }, [compact, sorted]);

  const maxCount = useMemo(
    () => Math.max(0, ...groups.flatMap((group) => group.items.map((item) => item.enrollment_count))),
    [groups],
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      <div
        aria-label={t("chartAriaLabel")}
        role="group"
        className={cn("space-y-4", compact && "space-y-3")}
      >
        {groups.map((group) => (
          <section key={group.id} className="space-y-2" aria-label={group.name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="flex min-w-0 items-center gap-2 font-medium text-foreground text-xs">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                  aria-hidden
                />
                <span className="truncate">{group.name}</span>
              </p>
              <p className="shrink-0 tabular-nums text-muted-foreground text-xs">
                {formatNumber(group.total)}
              </p>
            </div>
            <ul className="space-y-1.5">
              {group.items.map((item) => {
                const ratio = maxCount > 0 ? item.enrollment_count / maxCount : 0;
                return (
                  <li
                    key={`${item.class_id}-${item.club_type_id}`}
                    className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-x-3 gap-y-1"
                  >
                    <p className="truncate text-muted-foreground text-xs">{item.class_name}</p>
                    <p className="text-right font-medium text-foreground text-xs tabular-nums">
                      {formatNumber(item.enrollment_count)}
                    </p>
                    <div className="col-span-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full w-full origin-left rounded-full"
                        style={{
                          backgroundColor: group.color,
                          transform: `scaleX(${ratio})`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {showTable ? (
        <div>
          <h3 className="mb-2 font-medium text-sm">{t("tableTitle")}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableClass")}</TableHead>
                <TableHead>{t("tableClubType")}</TableHead>
                <TableHead className="text-right">{t("tableEnrollments")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((item) => (
                <TableRow key={`${item.class_id}-${item.club_type_id}`}>
                  <TableCell>{item.class_name}</TableCell>
                  <TableCell>{item.club_type_name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.enrollment_count)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
