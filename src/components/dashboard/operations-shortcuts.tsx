import Link from "next/link";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Tent,
  Trophy,
  User,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperationsShortcutId } from "@/lib/dashboard/operations-home";

const SHORTCUT_ICONS: Record<OperationsShortcutId, typeof Building2> = {
  clubs: Building2,
  users: User,
  enrollments: ClipboardList,
  assignments: UserPlus,
  validations: GraduationCap,
  reports: FileText,
  folders: Trophy,
  activities: CalendarDays,
  camporees: Tent,
};

const TILE_MOTION =
  "transition-[background-color,transform] duration-150 ease-[var(--ease-out-expo)] motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.97]";

interface OperationsShortcutsProps {
  title: string;
  description: string;
  labels: Record<OperationsShortcutId, string>;
  items: Array<{ id: OperationsShortcutId; href: string }>;
}

export function OperationsShortcuts({
  title,
  description,
  labels,
  items,
}: OperationsShortcutsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="operations-shortcuts">
      <div className="mb-3 space-y-1">
        <h2 id="operations-shortcuts" className="font-medium text-foreground text-sm">
          {title}
        </h2>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => {
          const Icon = SHORTCUT_ICONS[item.id];
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10",
                TILE_MOTION,
                "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/60",
              )}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate font-medium text-sm">{labels[item.id]}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
