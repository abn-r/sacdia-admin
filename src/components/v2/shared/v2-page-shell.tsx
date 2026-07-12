import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type V2PageShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  bleed?: boolean;
};

export function V2PageShell({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  bleed = false,
}: V2PageShellProps) {
  if (bleed) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold tracking-tight">{title}</p>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
        <div className={contentClassName}>{children}</div>
      </div>
    );
  }

  return (
    <Card className={cn("border-border/60 shadow-sm", className)}>
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
      {children ? (
        <CardContent className={cn("pt-6", contentClassName)}>{children}</CardContent>
      ) : null}
    </Card>
  );
}
