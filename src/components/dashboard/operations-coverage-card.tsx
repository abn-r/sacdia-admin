import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { OperationsStatRow } from "@/components/dashboard/operations-bento-tile";

interface OperationsCoverageCardProps {
  title: string;
  description: string;
  coverageLabel: string;
  coverageValue: string;
  coveragePct: number | null;
  submittedLabel: string;
  submittedValue: string;
  missingLabel: string;
  missingValue: string;
  expectedLabel: string;
  expectedValue: string;
  notApplicable: boolean;
  notApplicableLabel: string;
  actionLabel: string;
  href?: string;
  hasMissing: boolean;
}

export function OperationsCoverageCard({
  title,
  description,
  coverageLabel,
  coverageValue,
  coveragePct,
  submittedLabel,
  submittedValue,
  missingLabel,
  missingValue,
  expectedLabel,
  expectedValue,
  notApplicable,
  notApplicableLabel,
  actionLabel,
  href,
  hasMissing,
}: OperationsCoverageCardProps) {
  return (
    <Card size="sm" className="h-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {href ? (
          <CardAction>
            <Button variant="outline" size="sm" asChild>
              <Link href={href}>
                <FileText className="size-4" aria-hidden />
                {actionLabel}
              </Link>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {notApplicable ? (
          <p className="text-muted-foreground text-sm">{notApplicableLabel}</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-muted-foreground text-xs">{coverageLabel}</p>
                <p
                  className={cn(
                    "font-semibold text-2xl tabular-nums tracking-tight",
                    hasMissing ? "text-destructive" : "text-primary",
                  )}
                >
                  {coverageValue}
                </p>
              </div>
              <Progress value={coveragePct ?? 0} aria-label={coverageLabel} />
            </div>
            <div className="space-y-1.5">
              <OperationsStatRow label={submittedLabel} value={submittedValue} />
              <OperationsStatRow
                label={missingLabel}
                value={missingValue}
                tone={hasMissing ? "warning" : "default"}
              />
              <OperationsStatRow label={expectedLabel} value={expectedValue} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
