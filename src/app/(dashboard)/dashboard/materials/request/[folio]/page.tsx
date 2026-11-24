import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { BankSnapshotCard } from "./_components/bank-snapshot-card";
import { DirectorCell } from "./_components/director-cell";
import { LinesTable } from "./_components/lines-table";
import { OrderSummaryRail } from "./_components/order-summary-rail";
import { ReceiptsSection } from "./_components/receipts-section";
import { DetailHeader } from "@/components/shared/detail-header";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyFormat } from "@/components/materials/money-format";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import { getConfig, getOrder, listReceipts } from "@/lib/api/materials";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import { extractComprobantes } from "@/lib/materials/comprobantes";
import { orderLocalFieldId } from "@/lib/materials/order-local-field";
import { buildReceiptPrintContextFromOrder } from "@/lib/materials/receipt-print";
import type { Orden } from "@/lib/types/materials";

type Params = Promise<{ folio: string }>;

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { folio } = await params;
  const user = await requireAdminUser();
  const t = await getTranslations("ops.materials");
  const format = await getFormatter();

  const canApprove = canCapability(user, "materials-inbox", "approve");
  const canDeliver = canCapability(user, "materials-inbox", "deliver");
  const canValidateReceipt = canCapability(user, "materials-receipts", "validate");

  let orden: Orden;
  try {
    orden = await getOrder(folio);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    const state = errorStateFromError(err);
    return <ErrorState kind={state.kind} detail={state.detail} retry />;
  }

  const linesTotal = orden.lines.length;
  const linesResolved = orden.lines.filter((l) => l.disponibilidad !== "pendiente").length;

  const showPayment =
    orden.estado === "aprobada" ||
    orden.estado === "pagada" ||
    orden.estado === "entregada" ||
    (orden.estado === "cancelada" && orden.refund_pending);

  let comprobantes = extractComprobantes(orden.comprobantes);
  if (comprobantes.length === 0) {
    comprobantes = await listReceipts(folio).catch(() => []);
  }
  const pendingReceipts = comprobantes.filter((c) => c.status === "pendiente").length;
  const showReceipts = showPayment || comprobantes.length > 0;

  const livePaymentConfig = showPayment
    ? await getConfig({ localFieldId: orderLocalFieldId(orden) }).catch(() => null)
    : null;

  const title = orden.folio_referencia ?? t("detail.untitled", { id: orden.id.slice(0, 8) });
  const directorName = orden.director?.nombre?.trim() || t("detail.directorFallback");
  const created = format.dateTime(new Date(orden.created_at), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SACDIA_DISPLAY_TIMEZONE,
  });

  return (
    <div className="space-y-6">
      <DetailHeader
        breadcrumbs={[
          { label: t("detail.breadcrumbRoot"), href: "/dashboard/materials/inbox" },
          { label: title },
        ]}
        title={title}
        subtitle={[orden.director?.nombre, orden.director?.club, t("detail.createdOn", { date: created })]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section aria-label={t("detail.delivery")} className="grid gap-5 rounded-xl bg-card p-5 shadow-card sm:grid-cols-2">
            <div>
              <h2 className="mb-1 text-xs font-medium text-muted-foreground">{t("detail.director")}</h2>
              <DirectorCell director={orden.director} fallbackId={orden.created_by} />
            </div>
            <div>
              <h2 className="mb-1 text-xs font-medium text-muted-foreground">{t("detail.delivery")}</h2>
              {orden.entrega === "envio" ? (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{t("detail.deliveryShip")}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    <MoneyFormat centavos={orden.envio_centavos} />
                  </span>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{t("detail.deliveryPickup")}</span>
                  <span className="text-sm text-muted-foreground">
                    {orden.pickup_address ?? t("detail.noPickupAddress")}
                  </span>
                </div>
              )}
            </div>
            {orden.notas && orden.notas.trim().length > 0 ? (
              <div className="sm:col-span-2">
                <h2 className="mb-1 text-xs font-medium text-muted-foreground">{t("detail.notes")}</h2>
                <p className="text-sm">{orden.notas}</p>
              </div>
            ) : null}
          </section>

          <LinesTable folio={orden.id} lines={orden.lines} estado={orden.estado} />

          {showPayment ? <BankSnapshotCard orden={orden} liveConfig={livePaymentConfig} /> : null}

          {showReceipts ? (
            <ReceiptsSection
              folio={orden.id}
              comprobantes={comprobantes}
              canReview={canValidateReceipt}
              printContext={buildReceiptPrintContextFromOrder(orden)}
            />
          ) : null}
        </div>

        <OrderSummaryRail
          orden={orden}
          directorName={directorName}
          canApprove={canApprove}
          canDeliver={canDeliver}
          linesResolved={linesResolved}
          linesTotal={linesTotal}
          pendingReceipts={pendingReceipts}
        />
      </div>
    </div>
  );
}
