import Link from "next/link";
import { ArrowRight, ArrowUpDown, Award, BookOpen, Inbox, Trophy, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
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
  reviewLabel: string;
  labels: Record<OperationsQueueId, string>;
  /** Already filtered to queues with work that the user can open. */
  items: OperationsWorkItem[];
  /** Formats a queue count with the active locale. */
  formatCount: (value: number) => string;
  /** When set, an empty queue shows this state; otherwise the block is omitted. */
  empty?: { title: string; description: string };
}

export function OperationsWorkQueue({
  headingId,
  title,
  reviewLabel,
  labels,
  items,
  formatCount,
  empty,
}: OperationsWorkQueueProps) {
  if (items.length === 0 && !empty) {
    return null;
  }

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="font-semibold text-base tracking-tight">
        {title}
      </h2>
      {items.length === 0 && empty ? (
        <EmptyState icon={Inbox} title={empty.title} description={empty.description} />
      ) : (
        <ul className="divide-y divide-border rounded-xl border bg-card">
          {items.map((item) => {
            const Icon = QUEUE_ICONS[item.id];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/60 motion-reduce:transition-none"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate font-medium text-sm">{labels[item.id]}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="font-semibold tabular-nums">{formatCount(item.count)}</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      {reviewLabel}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
