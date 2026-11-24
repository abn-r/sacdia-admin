import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Single-colour progress: decided rows over total, told as "2 de 3". */
export function CertificateBatchProgress({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const t = useTranslations("queues.certificates.batches");
  const width = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-label={t("progressLabel", { done, total })}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-1 w-24 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-foreground/70 transition-[width]" style={{ width: `${width}%` }} />
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">{t("progress", { done, total })}</span>
    </div>
  );
}
