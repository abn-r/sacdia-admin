import Link from "next/link";
import {
  ArrowUpDown,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Inbox,
  Trophy,
  UserPlus,
} from "lucide-react";
import type { OperationsQueueId, OperationsWorkItem } from "@/lib/dashboard/operations-home";

const QUEUE_ICONS: Record<OperationsQueueId, typeof Inbox> = {
  roles: UserPlus,
  transfers: ArrowUpDown,
  classes: BookOpen,
  honors: Award,
  folders: Trophy,
};

export interface OperationsWorkQueueProps {
  headingId: string;
  title: string;
  labels: Record<OperationsQueueId, string>;
  /** Already filtered to queues with work that the user can open. */
  items: OperationsWorkItem[];
  /** Formatted sum of all item counts, shown in the heading pill. */
  total: string;
  /** Screen-reader text for the pill ("7 pendientes"). */
  totalLabel: string;
  /** Formats a queue count with the active locale. */
  formatCount: (value: number) => string;
  /** Short positive line shown when nothing is pending. */
  emptyLabel: string;
}

export function OperationsWorkQueue({
  headingId,
  title,
  labels,
  items,
  total,
  totalLabel,
  formatCount,
  emptyLabel,
}: OperationsWorkQueueProps) {
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 id={headingId} className="font-semibold text-base tracking-tight">
          {title}
        </h2>
        {items.length > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-xs tabular-nums">
            <span aria-hidden>{total}</span>
            <span className="sr-only">{totalLabel}</span>
          </span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-card p-4 text-sm shadow-card">
          <CheckCircle2
            className="size-4 shrink-0 text-[color-mix(in_oklch,var(--success),black_15%)] dark:text-success"
            aria-hidden
          />
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-card">
          {items.map((item) => {
            const Icon = QUEUE_ICONS[item.id];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset motion-reduce:transition-none"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium text-sm">
                    {labels[item.id]}
                  </span>
                  <span className="font-semibold text-sm tabular-nums">
                    {formatCount(item.count)}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
