"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OperationsBentoTileProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  href?: string;
  hrefLabel?: string;
}

export function OperationsBentoTile({
  title,
  description,
  children,
  className,
  href,
  hrefLabel,
}: OperationsBentoTileProps) {
  return (
    <Card size="sm" className={cn("h-auto gap-3 py-4", className)} aria-label={title}>
      <CardHeader className="gap-1">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm">{title}</CardTitle>
          {href ? (
            <Button variant="ghost" size="icon-xs" className="shrink-0" asChild>
              <Link href={href} aria-label={hrefLabel ?? title}>
                <ArrowRight />
              </Link>
            </Button>
          ) : null}
        </div>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent className="space-y-3">{children}</CardContent> : null}
    </Card>
  );
}

interface OperationsStatRowProps {
  label: string;
  value: string;
  tone?: "default" | "warning";
  className?: string;
}

export function OperationsStatRow({
  label,
  value,
  tone = "default",
  className,
}: OperationsStatRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm", className)}>
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span
        className={cn(
          "shrink-0 font-medium tabular-nums",
          tone === "warning" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}
