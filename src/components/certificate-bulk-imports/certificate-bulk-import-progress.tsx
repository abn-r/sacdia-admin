import { cn } from "@/lib/utils";

export function CertificateBulkImportProgress({
  approved,
  rejected,
  pending,
  total,
  className,
}: {
  approved: number;
  rejected: number;
  pending: number;
  total: number;
  className?: string;
}) {
  const safeTotal = Math.max(total, 1);
  const segments = [
    { value: approved, className: "bg-success" },
    { value: rejected, className: "bg-destructive" },
    { value: pending, className: "bg-warning" },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-2 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {segments.map((segment, index) =>
          segment.value > 0 ? (
            <div
              key={index}
              className={segment.className}
              style={{ width: `${(segment.value / safeTotal) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {approved}/{total}
      </span>
    </div>
  );
}
