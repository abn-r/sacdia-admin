"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface RailItem {
  href: string;
  label: string;
  count?: number;
}

export interface RailGroup {
  label: string;
  items: RailItem[];
}

export interface RailLayoutProps {
  groups: RailGroup[];
  children: ReactNode;
  ariaLabel: string;
  className?: string;
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RailLayout({ groups, children, ariaLabel, className }: RailLayoutProps) {
  const t = useTranslations("shared.kit.rail");
  const pathname = usePathname();
  const router = useRouter();
  const all = groups.flatMap((g) => g.items);
  const current = all.find((i) => isActive(pathname, i.href))?.href;

  return (
    <div className={cn("grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start", className)}>
      <div className="md:hidden">
        <Select value={current} onValueChange={(href) => router.push(href)}>
          <SelectTrigger className="w-full" aria-label={t("select")}>
            <SelectValue placeholder={t("select")} />
          </SelectTrigger>
          <SelectContent>
            {all.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label={ariaLabel} className="hidden space-y-4 md:sticky md:top-4 md:block">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <h6 className="px-2.5 font-medium text-muted-foreground text-xs">{group.label}</h6>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === current;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        active
                          ? "bg-primary-soft font-medium text-primary-soft-foreground"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.count !== undefined && (
                        <span className="text-muted-foreground text-xs tabular-nums">{item.count}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
