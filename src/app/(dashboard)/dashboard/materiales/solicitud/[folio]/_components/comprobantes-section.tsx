import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MoneyFormat } from "@/components/materiales/money-format";
import { ComprobanteReviewActions } from "./comprobante-review-actions";
import type { Comprobante } from "@/lib/types/materiales";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "secondary" | "success" | "destructive" | "warning" | "outline" }
> = {
  pendiente: { label: "Pendiente", variant: "warning" },
  aprobado: { label: "Aprobado", variant: "success" },
  rechazado: { label: "Rechazado", variant: "destructive" },
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

interface ComprobantesSectionProps {
  folio: string;
  comprobantes: Comprobante[];
  /** When true, review actions (approve/reject) are rendered for pendiente items */
  canReview: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComprobantesSection({
  folio,
  comprobantes,
  canReview,
}: ComprobantesSectionProps) {
  if (comprobantes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No se han subido comprobantes aún.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comprobantes.map((c) => {
        const statusCfg = STATUS_CONFIG[c.status] ?? {
          label: c.status,
          variant: "outline" as const,
        };

        return (
          <div
            key={c.id}
            className="rounded-lg border border-border/60 bg-card px-4 py-3 space-y-2"
          >
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium truncate flex-1 min-w-0">
                {c.file_name}
              </span>
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              {c.signed_url && (
                <a
                  href={c.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver archivo
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Monto:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  <MoneyFormat centavos={c.monto_centavos} />
                </span>
              </span>
              {c.fecha_pago && (
                <span>
                  Fecha pago:{" "}
                  <span className="text-foreground">{formatDate(c.fecha_pago)}</span>
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
                Subido: <span className="text-foreground">{formatDate(c.created_at)}</span>
              </span>
              <span>{formatBytes(c.size_bytes)}</span>
            </div>

            {/* Reject reason */}
            {c.status === "rechazado" && c.reject_reason && (
              <p className="text-xs text-destructive">
                Motivo de rechazo: {c.reject_reason}
              </p>
            )}

            {/* Review actions — only for pendiente comprobantes when reviewer role present */}
            {c.status === "pendiente" && canReview && (
              <ComprobanteReviewActions folio={folio} comprobanteId={c.id} />
            )}
          </div>
        );
      })}
    </div>
  );
}
