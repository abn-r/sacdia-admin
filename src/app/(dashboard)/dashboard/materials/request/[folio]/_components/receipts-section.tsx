import { ExternalLink, FileText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { MoneyFormat } from "@/components/materials/money-format";
import { ReceiptPrintButton } from "@/components/materials/receipt-print-button";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import { extractComprobantes } from "@/lib/materials/comprobantes";
import type { ReceiptPrintContext } from "@/lib/materials/receipt-print";
import type { Comprobante, MaterialComprobanteStatus } from "@/lib/types/materials";
import { ReceiptReviewActions } from "./receipt-review-actions";

const RECEIPT_INTENT: Record<MaterialComprobanteStatus, StatusIntent> = {
  pendiente: "warning",
  aprobado: "success",
  rechazado: "destructive",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ReceiptsSectionProps {
  folio: string;
  comprobantes?: Comprobante[] | { data?: Comprobante[] | null } | null;
  /** Review actions (approve/reject) for pending receipts. */
  canReview: boolean;
  printContext: ReceiptPrintContext;
}

export function ReceiptsSection({ folio, comprobantes, canReview, printContext }: ReceiptsSectionProps) {
  const t = useTranslations("ops.materials.receipts");
  const format = useFormatter();
  const rows = extractComprobantes(comprobantes);

  const date = (iso: string | null) =>
    iso
      ? format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric", timeZone: SACDIA_DISPLAY_TIMEZONE })
      : "—";

  return (
    <section aria-labelledby="mat-receipts-heading" className="space-y-3">
      <h2 id="mat-receipts-heading" className="text-base font-semibold">
        {t("title")}
      </h2>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-card px-5 py-6 text-sm text-muted-foreground shadow-card">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl bg-card shadow-card">
          {rows.map((c) => (
            <li key={c.id} className="space-y-3 px-5 py-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.file_name}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
                    {t("uploadedOn", { date: date(c.created_at) })} · {formatBytes(c.size_bytes)}
                  </p>
                </div>
                <StatusBadge intent={RECEIPT_INTENT[c.status] ?? "neutral"} label={t(`status.${c.status}`)} />
              </div>

              <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                <div className="flex gap-1.5">
                  <dt className="text-muted-foreground">{t("amount")}</dt>
                  <dd className="font-medium tabular-nums">
                    <MoneyFormat centavos={c.monto_centavos} />
                  </dd>
                </div>
                {c.fecha_pago ? (
                  <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">{t("paidOn")}</dt>
                    <dd>{date(c.fecha_pago)}</dd>
                  </div>
                ) : null}
                {c.ref_bancaria_declarada ? (
                  <div className="flex gap-1.5">
                    <dt className="text-muted-foreground">{t("reference")}</dt>
                    <dd className="font-mono">{c.ref_bancaria_declarada}</dd>
                  </div>
                ) : null}
              </dl>

              {c.status === "rechazado" && c.reject_reason ? (
                <p className="text-sm text-destructive">{t("rejectReason", { reason: c.reject_reason })}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <ReceiptPrintButton comprobante={c} context={printContext} />
                {c.signed_url ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={c.signed_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink data-icon="inline-start" />
                      {t("view")}
                    </a>
                  </Button>
                ) : null}
                {c.status === "pendiente" && canReview ? (
                  <div className="ml-auto">
                    <ReceiptReviewActions folio={folio} comprobanteId={c.id} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
