"use client";

import { PanelDashboardLink } from "@/components/shared/panel-dashboard-link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { ElementType } from "react";

export type CatalogHubCard = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  colorClass: string;
  readOnly?: boolean;
};

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon: ElementType;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export function CatalogHubGrid({
  sectionTitle,
  sectionIcon,
  cards,
  readOnlyLabel,
}: {
  sectionTitle: string;
  sectionIcon: ElementType;
  cards: CatalogHubCard[];
  readOnlyLabel: string;
}) {
  return (
    <div>
      <SectionHeader title={sectionTitle} icon={sectionIcon} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <PanelDashboardLink key={card.href} href={card.href} className="group">
            <div
              className={cn(
                "rounded-xl border border-border/60 bg-card p-4",
                "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      card.colorClass,
                    )}
                  >
                    <card.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold leading-tight">{card.title}</span>
                      {card.readOnly ? (
                        <Badge variant="secondary" className="py-0 text-xs">
                          {readOnlyLabel}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="mt-0.5 size-4 shrink-0 translate-x-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
            </div>
          </PanelDashboardLink>
        ))}
      </div>
    </div>
  );
}
