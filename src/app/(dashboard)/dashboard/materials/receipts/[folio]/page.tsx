import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Banknote,
  ShoppingBag,
  ChevronLeft,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/materials/status-badge";
import { MoneyFormat } from "@/components/materials/money-format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getOrder, listReceipts } from "@/lib/api/materials";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import { ApiError } from "@/lib/api/client";
// Direct cross-route import — component lives co-located with solicitud detail;
// no duplication. Next.js allows importing from any route's _components folder.
import { ReceiptsSection } from "@/app/(dashboard)/dashboard/materials/request/[folio]/_components/receipts-section";
import type { Comprobante } from "@/lib/types/materials";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ folio: string }>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComprobantesDetailPage({
  params,
}: {
  params: Params;
}) {
  const { folio } = await params;
  const user = await requireAdminUser();

  // Guard: only users with validate-receipt permission can access this route
  if (!hasPermission(user, "materiales:validate-receipt")) {
    redirect("/dashboard");
  }

  const canReview = true; // already gated above — any user reaching this page can review

  // Fetch order and comprobantes in parallel
  let orden;
  let comprobantes: Comprobante[] = [];

  try {
    [orden, comprobantes] = await Promise.all([
      getOrder(folio),
      listReceipts(folio),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" className="-ml-1" asChild>
        <Link href="/dashboard/materials/receipts">
          <ChevronLeft className="mr-1 size-4" />
          Volver a comprobantes
        </Link>
      </Button>

      {/* Page header */}
      <PageHeader
        title={`Comprobantes — ${orden.folio_referencia ?? folio}`}
        description="Revisá y validá los comprobantes de pago adjuntos a esta solicitud."
        actions={<StatusBadge estado={orden.estado} />}
      />

      {/* ── Order summary card ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Bank snapshot — only present after approval */}
        {orden.bank_account_clabe && (
          <Card className="gap-3 py-4">
            <CardContent className="flex items-start gap-3">
              <Banknote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Datos bancarios</p>
                {orden.bank_name && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Banco: </span>
                    {orden.bank_name}
                  </p>
                )}
                <p className="font-mono text-xs tabular-nums">
                  {orden.bank_account_clabe}
                </p>
                {orden.account_holder && (
                  <p className="text-xs text-muted-foreground">
                    {orden.account_holder}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Comprobantes list ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Comprobantes de pago ({comprobantes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiptsSection
            folio={folio}
            comprobantes={comprobantes}
            canReview={canReview}
          />
        </CardContent>
      </Card>
    </div>
  );
}
