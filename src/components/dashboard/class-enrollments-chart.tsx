import type { ClassTypeGroup } from "@/lib/dashboard/operations-home";

export interface ClassEnrollmentsChartProps {
  headingId: string;
  title: string;
  /** Accessible name of the chart figure. */
  chartLabel: string;
  /** Screen-reader summary of the totals. */
  summary: string;
  legendLabel: string;
  emptyLabel: string;
  /** Classes with enrollments, grouped and colored by club type. */
  groups: ClassTypeGroup[];
  formatCount: (value: number) => string;
}

export function ClassEnrollmentsChart({
  headingId,
  title,
  chartLabel,
  summary,
  legendLabel,
  emptyLabel,
  groups,
  formatCount,
}: ClassEnrollmentsChartProps) {
  const maxCount = Math.max(
    0,
    ...groups.flatMap((group) => group.items.map((item) => item.enrollment_count)),
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={headingId} className="font-semibold text-base tracking-tight">
          {title}
        </h2>
        {groups.length > 0 ? (
          <ul aria-label={legendLabel} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                  aria-hidden
                />
                {group.name}
                <span className="font-medium text-foreground tabular-nums">
                  {formatCount(group.total)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="rounded-xl bg-card p-4 shadow-card">
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyLabel}</p>
        ) : (
          <figure aria-label={chartLabel} className="space-y-4">
            <figcaption className="sr-only">{summary}</figcaption>
            {groups.map((group) => (
              <ul key={group.id} aria-label={group.name} className="space-y-2">
                {group.items.map((item) => {
                  const ratio = maxCount > 0 ? item.enrollment_count / maxCount : 0;
                  return (
                    <li
                      key={`${item.club_type_id}-${item.class_id}`}
                      data-club-type={group.name}
                      className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3rem]"
                    >
                      <span className="truncate text-muted-foreground">{item.class_name}</span>
                      <span aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
                        <span
                          data-slot="formation-bar"
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(ratio * 100, 1.5)}%`,
                            backgroundColor: group.color,
                          }}
                        />
                      </span>
                      <span className="text-right font-medium tabular-nums">
                        {formatCount(item.enrollment_count)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ))}
          </figure>
        )}
      </div>
    </section>
  );
}
