import { ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toneBadgeProps } from "@/components/materials/badge-tones";
import { MoneyFormat } from "@/components/materials/money-format";
import type { Comprobante } from "@/lib/types/materials";
import { extractComprobantes } from "@/lib/materials/comprobantes";
import type { ReceiptPrintContext } from "@/lib/materials/receipt-print";
import { ReceiptPrintButton } from "@/components/materials/receipt-print-button";
import { ReceiptReviewActions } from "./receipt-review-actions";
import { Button } from "@/components/ui/button";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; tone: "warning" | "success" | "danger" }
> = {
  pendiente: { label: "Pendiente", tone: "warning" },
  aprobado: { label: "Aprobado", tone: "success" },
  rechazado: { label: "Rechazado", tone: "danger" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReceiptsSectionProps {
  folio: string;
  comprobantes?: Comprobante[] | { data?: Comprobante[] | null } | null;
  /** When true, review actions (approve/reject) are rendered for pendiente items */
  canReview: boolean;
  printContext: ReceiptPrintContext;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReceiptsSection({
  folio,
  comprobantes,
  canReview,
  printContext,
}: ReceiptsSectionProps) {
  const rows = extractComprobantes(comprobantes);

  return (
    <section
      aria-labelledby="comprobantes-heading"
      className="mt-6 rounded-lg border border-border/60 bg-card p-5"
    >
      <h2
        id="comprobantes-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wide"
      >
        Comprobantes de pago
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No se han subido comprobantes aún.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status] ?? {
              label: c.status,
              tone: "warning" as const,
            };
            const receiptBadgeProps =
              STATUS_CONFIG[c.status] != null
                ? toneBadgeProps(statusCfg.tone)
                : { variant: "outline" as const };

            return (
              <div
                key={c.id}
                className="space-y-2 rounded-md border border-border/60 bg-background px-4 py-3"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.file_name}</p>
                    <Badge {...receiptBadgeProps} className="mt-1">
                      {statusCfg.label}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                  <ReceiptPrintButton comprobante={c} context={printContext} />
                  {c.signed_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={c.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink data-icon="inline-start" />
                        Ver archivo
                      </a>
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Monto:{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      <MoneyFormat centavos={c.monto_centavos} />
                    </span>
                  </span>
                  {c.fecha_pago && (
                    <span>
                      Fecha pago:{" "}
                      <span className="text-foreground">
                        {formatDate(c.fecha_pago)}
                      </span>
                    </span>
                  )}
                  {c.ref_bancaria_declarada && (
                    <span>
                      Ref:{" "}
                      <span className="font-mono text-foreground">
                        {c.ref_bancaria_declarada}
                      </span>
                    </span>
                  )}
                  <span>
                    Subido:{" "}
                    <span className="text-foreground">
                      {formatDate(c.created_at)}
                    </span>
                  </span>
                  <span>{formatBytes(c.size_bytes)}</span>
                </div>

                {c.status === "rechazado" && c.reject_reason && (
                  <p className="text-xs text-destructive">
                    Motivo de rechazo: {c.reject_reason}
                  </p>
                )}

                {c.status === "pendiente" && canReview && (
                  <ReceiptReviewActions
                    folio={folio}
                    comprobanteId={c.id}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
