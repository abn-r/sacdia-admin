import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ActionSidebarSection {
  heading?: string;
  items: ReactNode[];
}

interface ActionSidebarProps {
  title: string;
  sections: ActionSidebarSection[];
  className?: string;
}

export function UserDetailActionSidebar({ title, sections, className }: ActionSidebarProps) {
  return (
    <Card className={cn("sticky top-20 gap-3 px-5 py-5", className)}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex flex-col gap-3">
        {sections.map((sec, idx) => (
          <div key={sec.heading ?? idx} className="flex flex-col gap-1.5">
            {sec.heading ? (
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {sec.heading}
              </div>
            ) : null}
            {sec.items.map((item, i) => (
              <div key={i}>{item}</div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
