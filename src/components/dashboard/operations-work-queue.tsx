import Link from "next/link";
import {
  ArrowUpDown,
  Award,
  BookOpen,
  Inbox,
  Trophy,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { OperationsQueueId, OperationsWorkItem } from "@/lib/dashboard/operations-home";

const QUEUE_ICONS: Record<OperationsQueueId, typeof Inbox> = {
  roles: UserPlus,
  transfers: ArrowUpDown,
  classes: BookOpen,
  honors: Award,
  folders: Trophy,
};

const ROW_MOTION =
  "transition-[background-color,transform] duration-150 ease-[var(--ease-out-expo)] motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.97]";

interface OperationsWorkQueueProps {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  openLabel: string;
  labels: Record<OperationsQueueId, string>;
  items: OperationsWorkItem[];
  accessibleHrefs: Partial<Record<OperationsQueueId, string>>;
}

export function OperationsWorkQueue({
  title,
  description,
  emptyTitle,
  emptyDescription,
  openLabel,
  labels,
  items,
  accessibleHrefs,
}: OperationsWorkQueueProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle id="operations-inbox">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
        ) : (
          <ul className="divide-y divide-border rounded-xl border">
            {items.map((item) => {
              const Icon = QUEUE_ICONS[item.id];
              const href = accessibleHrefs[item.id];
              const content = (
                <>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="truncate font-medium text-sm">{labels[item.id]}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="destructive" className="tabular-nums">
                      {item.count}
                    </Badge>
                    {href ? (
                      <span className="text-muted-foreground text-xs">{openLabel}</span>
                    ) : null}
                  </span>
                </>
              );

              return (
                <li key={item.id}>
                  {href ? (
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2.5",
                        ROW_MOTION,
                        "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/70",
                      )}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
