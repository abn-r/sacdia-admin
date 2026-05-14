import { notFound } from "next/navigation";
import {
  Package,
  Building2,
  MapPin,
  Calendar,
  Banknote,
  ShoppingBag,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EstadoBadge } from "@/components/materiales/estado-badge";
import { MoneyFormat } from "@/components/materiales/money-format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrden } from "@/lib/api/materiales";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import { ApiError } from "@/lib/api/client";
import { LinesTable } from "./_components/lines-table";
import { ComprobantesSection } from "./_components/comprobantes-section";
import { ApproveButton } from "./_components/approve-button";
import { CancelDialog } from "./_components/cancel-dialog";
import { DeliverButton } from "./_components/deliver-button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ folio: string }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SolicitudDetailPage({ params }: { params: Params }) {
  const { folio } = await params;
  const user = await requireAdminUser();

  // Permission flags (passed down to client components as props)
  const canApprove = hasPermission(user, "materiales:approve");
  const canDeliver = hasPermission(user, "materiales:deliver");
  const canValidateReceipt = hasPermission(user, "materiales:validate-receipt");

  // Fetch order
  let orden;
  try {
    orden = await getOrden(folio);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const allLinesResolved =
    orden.lines.length > 0 &&
    orden.lines.every((l) => l.disponibilidad !== "pendiente");

  const isTerminal =
    orden.estado === "entregada" || orden.estado === "cancelada";

  const showComprobantes =
    orden.estado === "aprobada" ||
    orden.estado === "pagada" ||
    orden.estado === "entregada";

  const entregaLabel =
    orden.entrega === "envio" ? "Envío a domicilio" : "Recoger en sede";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title={orden.folio_referencia ?? `Solicitud ${folio.slice(0, 8)}…`}
        description={`Pedido creado el ${formatDate(orden.created_at)}`}
        breadcrumbs={[
          { label: "Bandeja", href: "/dashboard/materiales/bandeja" },
          {
            label: orden.folio_referencia ?? "Solicitud",
          },
        ]}
        actions={<EstadoBadge estado={orden.estado} />}
      />

      {/* ── Summary card ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-3 py-4">
          <CardContent className="flex items-start gap-3">
            <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Director / Club</p>
              <p className="text-sm font-medium">
                {orden.director?.nombre ?? orden.created_by}
              </p>
              <p className="text-xs text-muted-foreground">
                {orden.director?.club}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardContent className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Entrega</p>
              <p className="text-sm font-medium">{entregaLabel}</p>
              {orden.pickup_address && (
                <p className="text-xs text-muted-foreground">
                  {orden.pickup_address}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardContent className="flex items-start gap-3">
            <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fechas</p>
              <p className="text-xs">
                Creada: <span className="text-foreground">{formatDate(orden.created_at)}</span>
              </p>
              {orden.approved_at && (
                <p className="text-xs">
                  Aprobada: <span className="text-foreground">{formatDate(orden.approved_at)}</span>
                </p>
              )}
              {orden.paid_at && (
                <p className="text-xs">
                  Pagada: <span className="text-foreground">{formatDate(orden.paid_at)}</span>
                </p>
              )}
              {orden.delivered_at && (
                <p className="text-xs">
                  Entregada: <span className="text-foreground">{formatDate(orden.delivered_at)}</span>
                </p>
              )}
              {orden.cancelled_at && (
                <p className="text-xs">
                  Cancelada: <span className="text-foreground">{formatDate(orden.cancelled_at)}</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardContent className="flex items-start gap-3">
            <ShoppingBag className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Totales</p>
              <p className="text-xs">
                Subtotal:{" "}
                <span className="tabular-nums text-foreground">
                  <MoneyFormat centavos={orden.subtotal_centavos} />
                </span>
              </p>
              <p className="text-xs">
                Envío:{" "}
                <span className="tabular-nums text-foreground">
                  <MoneyFormat centavos={orden.envio_centavos} />
                </span>
              </p>
              <p className="text-sm font-semibold">
                Total:{" "}
                <span className="tabular-nums">
                  <MoneyFormat centavos={orden.total_centavos} />
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      {orden.notas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notas del director</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{orden.notas}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Lines table ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4" />
            Líneas del pedido ({orden.lines.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <LinesTable
            folio={folio}
            lines={orden.lines}
            estado={orden.estado}
          />
        </CardContent>
      </Card>

      {/* ── Bank snapshot (approved+) ─────────────────────────────────────── */}
      {orden.bank_account_clabe && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Banknote className="size-4" />
              Datos bancarios (snapshot al aprobar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              {orden.bank_name && (
                <>
                  <dt className="text-muted-foreground">Banco</dt>
                  <dd className="col-span-2">{orden.bank_name}</dd>
                </>
              )}
              <dt className="text-muted-foreground">CLABE</dt>
              <dd className="col-span-2 font-mono">{orden.bank_account_clabe}</dd>
              {orden.account_holder && (
                <>
                  <dt className="text-muted-foreground">Titular</dt>
                  <dd className="col-span-2">{orden.account_holder}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* ── Comprobantes section ──────────────────────────────────────────── */}
      {showComprobantes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Comprobantes de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <ComprobantesSection
              folio={folio}
              comprobantes={orden.comprobantes}
              canReview={canValidateReceipt}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Cancel reason (cancelled) ─────────────────────────────────────── */}
      {orden.estado === "cancelada" && orden.cancel_reason && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">
              Motivo de cancelación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{orden.cancel_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Actions card ──────────────────────────────────────────────────── */}
      {!isTerminal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {/* en_revision: approve + cancel */}
              {orden.estado === "en_revision" && canApprove && (
                <ApproveButton
                  folio={folio}
                  allLinesResolved={allLinesResolved}
                  canApprove={canApprove}
                />
              )}

              {/* aprobada: cancel */}
              {/* pagada: deliver + cancel */}
              {orden.estado === "pagada" && canDeliver && (
                <DeliverButton folio={folio} />
              )}

              {/* Cancel available from en_revision and aprobada and pagada (campo only) */}
              {(orden.estado === "en_revision" ||
                orden.estado === "aprobada" ||
                orden.estado === "pagada") &&
                canApprove && (
                  <CancelDialog folio={folio} estado={orden.estado} />
                )}
            </div>

            {/* Hint when lines not all resolved yet */}
            {orden.estado === "en_revision" && !allLinesResolved && (
              <p className="mt-2 text-xs text-muted-foreground">
                Resolvé todas las líneas antes de aprobar la solicitud.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Terminal state banner ─────────────────────────────────────────── */}
      {isTerminal && (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {orden.estado === "entregada"
            ? "Esta solicitud fue entregada. No se pueden realizar más acciones."
            : "Esta solicitud fue cancelada. No se pueden realizar más acciones."}
        </div>
      )}
    </div>
  );
}
