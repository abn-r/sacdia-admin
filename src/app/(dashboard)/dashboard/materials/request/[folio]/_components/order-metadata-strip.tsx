import { MoneyFormat } from "@/components/materials/money-format";
import type { Orden } from "@/lib/types/materials";
import { DirectorCell } from "./director-cell";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
    const time = new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${day} · ${time}`;
  } catch {
    return iso;
  }
}

// ─── Cells ────────────────────────────────────────────────────────────────────

interface CellProps {
  label: string;
  children: React.ReactNode;
}

function Cell({ label, children }: CellProps) {
  return (
    <div className="flex flex-col">
      <span className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

interface ChronologyRowProps {
  label: string;
  value: string;
  muted?: boolean;
  destructive?: boolean;
}

function ChronologyRow({ label, value, muted, destructive }: ChronologyRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          destructive
            ? "text-sm font-medium text-destructive"
            : muted
              ? "text-sm text-muted-foreground"
              : "text-sm font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface OrderMetadataStripProps {
  orden: Orden;
}

export function OrderMetadataStrip({ orden }: OrderMetadataStripProps) {
  const isEnvio = orden.entrega === "envio";

  return (
    <div className="rounded-lg border border-border/60 bg-card p-5">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Director */}
        <Cell label="Director">
          <DirectorCell
            director={orden.director}
            fallbackId={orden.created_by}
          />
        </Cell>

        {/* Entrega */}
        <Cell label="Entrega">
          {isEnvio ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                Envío a domicilio
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                <MoneyFormat centavos={orden.envio_centavos} />
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                Recoger en sucursal
              </span>
              <span className="text-sm text-muted-foreground">
                {orden.pickup_address ?? "Sin dirección configurada"}
              </span>
            </div>
          )}
        </Cell>

        {/* Cronología */}
        <Cell label="Cronología">
          <div className="flex flex-col gap-1.5">
            <ChronologyRow
              label="Creada"
              value={formatDateTime(orden.created_at)}
            />

            {orden.estado === "en_revision" && (
              <ChronologyRow label="Aprobada" value="—" muted />
            )}

            {orden.estado === "aprobada" && (
              <>
                <ChronologyRow
                  label="Aprobada"
                  value={formatDateTime(orden.approved_at)}
                />
                <ChronologyRow label="Pagada" value="—" muted />
              </>
            )}

            {orden.estado === "pagada" && (
              <>
                <ChronologyRow
                  label="Aprobada"
                  value={formatDateTime(orden.approved_at)}
                />
                <ChronologyRow
                  label="Pagada"
                  value={formatDateTime(orden.paid_at)}
                />
                <ChronologyRow label="Entregada" value="—" muted />
              </>
            )}

            {orden.estado === "entregada" && (
              <>
                <ChronologyRow
                  label="Aprobada"
                  value={formatDateTime(orden.approved_at)}
                />
                <ChronologyRow
                  label="Pagada"
                  value={formatDateTime(orden.paid_at)}
                />
                <ChronologyRow
                  label="Entregada"
                  value={formatDateTime(orden.delivered_at)}
                />
              </>
            )}

            {orden.estado === "cancelada" && (
              <ChronologyRow
                label="Cancelada"
                value={formatDateTime(orden.cancelled_at)}
                destructive
              />
            )}
          </div>
        </Cell>
      </div>
    </div>
  );
}
