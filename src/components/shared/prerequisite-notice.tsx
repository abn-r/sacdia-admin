"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePanelPath } from "@/lib/v2/panel-path-context";

export type PrerequisiteNoticeItem = {
  id: string;
  description: string;
  href: string | null;
  actionLabel: string;
};

type PrerequisiteNoticeProps = {
  title: string;
  items: PrerequisiteNoticeItem[];
  contactAdminLabel: string;
};

export function PrerequisiteNotice({
  title,
  items,
  contactAdminLabel,
}: PrerequisiteNoticeProps) {
  const { toPanelPath } = usePanelPath();

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm"
    >
      <p className="font-medium text-foreground">{title}</p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-muted-foreground">{item.description}</p>
            {item.href ? (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={toPanelPath(item.href)}>{item.actionLabel}</Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">{contactAdminLabel}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
