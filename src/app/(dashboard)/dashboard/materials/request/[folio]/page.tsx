import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/materials/status-badge";
import { getOrder } from "@/lib/api/materials";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import { ApiError } from "@/lib/api/client";
import { BankSnapshotCard } from "./_components/bank-snapshot-card";
import { PageHeader } from "@/components/shared/page-header";
import { ReceiptsSection } from "./_components/receipts-section";
import { LinesTable } from "./_components/lines-table";
import { OrderMetadataStrip } from "./_components/order-metadata-strip";
import { OrderStickyBar } from "./_components/order-sticky-bar";
import { OrderSummaryRail } from "./_components/order-summary-rail";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ folio: string }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCreatedLong(iso: string): string {
  try {
    const date = new Date(iso);
    const long = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
    const time = new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${long} · ${time}`;
  } catch {
    return iso;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SolicitudDetailPage({
  params,
}: {
  params: Params;
}) {
  const { folio } = await params;
  const user = await requireAdminUser();

  const canApprove = hasPermission(user, "materiales:approve");
  const canDeliver = hasPermission(user, "materiales:deliver");
  const canValidateReceipt = hasPermission(user, "materiales:validate-receipt");

  let orden;
  try {
    orden = await getOrder(folio);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // Derived metrics
  const linesTotal = orden.lines.length;
  const linesResolved = orden.lines.filter(
    (l) => l.disponibilidad !== "pendiente",
  ).length;

  const showBankSnapshot =
    orden.estado === "aprobada" ||
    orden.estado === "pagada" ||
    orden.estado === "entregada" ||
    (orden.estado === "cancelada" && orden.refund_pending);

  const showComprobantes =
    orden.estado === "aprobada" ||
    orden.estado === "pagada" ||
    orden.estado === "entregada" ||
    (orden.estado === "cancelada" && orden.refund_pending);

  const titulo =
    orden.folio_referencia ?? `Solicitud ${orden.id.slice(0, 8)}…`;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* ─── Main column ──────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <PageHeader
            className="mb-6 font-mono"
            title={titulo}
            description={`Creada el ${formatCreatedLong(orden.created_at)}`}
            breadcrumbs={[
              {
                label: "Materiales / Solicitudes",
                href: "/dashboard/materials/inbox",
              },
              { label: titulo },
            ]}
            actions={<StatusBadge estado={orden.estado} />}
          />

          {/* Metadata strip */}
          <OrderMetadataStrip orden={orden} />

          {/* Notas (only when non-empty) */}
          {orden.notas && orden.notas.trim().length > 0 && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-4">
              <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="text-sm italic text-foreground/90">
                {orden.notas}
              </div>
            </div>
          )}

          {/* Bank snapshot (when applicable) */}
          {showBankSnapshot && <BankSnapshotCard orden={orden} />}

          {/* Partidas */}
          <LinesTable
            folio={orden.id}
            lines={orden.lines}
            estado={orden.estado}
            subtotalCentavos={orden.subtotal_centavos}
            envioCentavos={orden.envio_centavos}
            totalCentavos={orden.total_centavos}
          />

          {/* Comprobantes */}
          {showComprobantes && (
            <ReceiptsSection
              folio={orden.id}
              comprobantes={orden.comprobantes}
              canReview={canValidateReceipt}
            />
          )}

          {/* Mobile/tablet sticky bottom bar */}
          <OrderStickyBar
            orden={orden}
            canApprove={canApprove}
            canDeliver={canDeliver}
            linesResolved={linesResolved}
            linesTotal={linesTotal}
          />
        </div>

        {/* ─── Right rail (desktop only) ────────────────────────────────── */}
        <OrderSummaryRail
          orden={orden}
          canApprove={canApprove}
          canValidateReceipt={canValidateReceipt}
          canDeliver={canDeliver}
          linesResolved={linesResolved}
          linesTotal={linesTotal}
        />
      </div>
    </div>
  );
}
