"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Inbox, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permission-utils";
import type { CamporeeKind } from "@/lib/types/camporee-orders";
import {
  CAMPOREE_SUPPLIES_CONFIGURE,
  CAMPOREE_SUPPLIES_DELIVER,
  CAMPOREE_SUPPLIES_REVIEW_PAY,
  type CamporeeSupplyCatalog,
  type CamporeeSupplyPlan,
  type CashReport,
  type KitchenReport,
  type SupplyUom,
} from "@/lib/types/camporee-supplies";
import {
  createCamporeeSupplyProduct,
  createCamporeeSupplySlot,
  deliverCamporeeSupplyLine,
  formatSupplyCentavos,
  getCamporeeSupplyCashReport,
  getCamporeeSupplyCatalog,
  getCamporeeSupplyKitchenReport,
  listCamporeeSupplyPlans,
  markCamporeeSupplyPaymentPaid,
  updateCamporeeSupplyProduct,
  updateCamporeeSupplySettings,
  updateCamporeeSupplySlot,
} from "@/lib/api/camporee-supplies";
import { getCamporeeSupplyUiErrorMessage } from "@/components/camporee-supplies/camporee-supply-errors";

const UOMS: SupplyUom[] = ["KG", "L", "BAG", "UNIT"];

const PLAN_STATUS_INTENT: Record<CamporeeSupplyPlan["status"], StatusIntent> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
};

const PAYMENT_STATUS_INTENT: Record<
  CamporeeSupplyPlan["payments"][number]["status"],
  StatusIntent
> = {
  ISSUED: "warning",
  PAID: "success",
  CANCELLED: "neutral",
};

export interface CamporeeSuppliesTabProps {
  camporeeId: number;
  camporeeType?: CamporeeKind;
}

function pesosToCentavos(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function CamporeeSuppliesTab({
  camporeeId,
  camporeeType = "local",
}: CamporeeSuppliesTabProps) {
  const t = useTranslations("camporee_supplies");
  const { user } = useAuth();
  const canConfigure = hasPermission(user, CAMPOREE_SUPPLIES_CONFIGURE);
  const canReviewPay = hasPermission(user, CAMPOREE_SUPPLIES_REVIEW_PAY);
  const canDeliver = hasPermission(user, CAMPOREE_SUPPLIES_DELIVER);

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CamporeeSupplyCatalog | null>(null);
  const [plans, setPlans] = useState<CamporeeSupplyPlan[]>([]);
  const [kitchen, setKitchen] = useState<KitchenReport | null>(null);
  const [cash, setCash] = useState<CashReport | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [cutoff, setCutoff] = useState("21:00");
  const [kitchenDate, setKitchenDate] = useState("");
  const [slotLabel, setSlotLabel] = useState("");
  const [slotTime, setSlotTime] = useState("07:00");
  const [productName, setProductName] = useState("");
  const [productUom, setProductUom] = useState<SupplyUom>("BAG");
  const [productPrice, setProductPrice] = useState("");
  const [deliverQty, setDeliverQty] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCatalog, nextPlans, nextKitchen, nextCash] = await Promise.all([
        getCamporeeSupplyCatalog(camporeeId, camporeeType),
        listCamporeeSupplyPlans(camporeeId, camporeeType),
        getCamporeeSupplyKitchenReport(
          camporeeId,
          camporeeType,
          kitchenDate || undefined,
        ),
        getCamporeeSupplyCashReport(camporeeId, camporeeType),
      ]);
      setCatalog(nextCatalog);
      setCutoff(nextCatalog.supply_edit_cutoff_local_time);
      setPlans(nextPlans);
      setKitchen(nextKitchen);
      setCash(nextCash);
    } catch (error) {
      toast.error(getCamporeeSupplyUiErrorMessage(error, t, "toasts.loadFailed"));
      setCatalog(null);
      setPlans([]);
      setKitchen(null);
      setCash(null);
    } finally {
      setLoading(false);
    }
  }, [camporeeId, camporeeType, kitchenDate, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPlan = plans.find((plan) => plan.plan_id === selectedPlanId) ?? null;

  const saveCutoff = async () => {
    setSaving(true);
    try {
      const next = await updateCamporeeSupplySettings(camporeeId, camporeeType, {
        supply_edit_cutoff_local_time: cutoff,
      });
      setCatalog(next);
      setCutoff(next.supply_edit_cutoff_local_time);
      toast.success(t("toasts.cutoffSaved"));
    } catch (error) {
      toast.error(getCamporeeSupplyUiErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const addSlot = async () => {
    if (!slotLabel.trim()) return;
    setSaving(true);
    try {
      await createCamporeeSupplySlot(camporeeId, camporeeType, {
        label: slotLabel.trim(),
        deliver_time: slotTime,
      });
      setSlotLabel("");
      toast.success(t("toasts.slotCreated"));
      await load();
    } catch (error) {
      toast.error(getCamporeeSupplyUiErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const addProduct = async () => {
    const centavos = pesosToCentavos(productPrice);
    if (!productName.trim() || centavos == null) return;
    setSaving(true);
    try {
      await createCamporeeSupplyProduct(camporeeId, camporeeType, {
        name: productName.trim(),
        uom: productUom,
        unit_cost_centavos: centavos,
      });
      setProductName("");
      setProductPrice("");
      toast.success(t("toasts.productCreated"));
      await load();
    } catch (error) {
      toast.error(getCamporeeSupplyUiErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const toggleSlot = async (slotId: string, active: boolean) => {
    try {
      await updateCamporeeSupplySlot(camporeeId, camporeeType, slotId, { active });
      await load();
    } catch (error) {
      toast.error(getCamporeeSupplyUiErrorMessage(error, t));
    }
  };

  const toggleProduct = async (productId: string, active: boolean) => {
    try {
      await updateCamporeeSupplyProduct(camporeeId, camporeeType, productId, {
        active,
      });
      await load();
    } catch (error) {
      toast.error(getCamporeeSupplyUiErrorMessage(error, t));
    }
  };

  const markPaid = async (paymentId: string) => {
    try {
      await markCamporeeSupplyPaymentPaid(paymentId);
      toast.success(t("toasts.markedPaid"));
      await load();
    } catch (error) {
      toast.error(getCamporeeSupplyUiErrorMessage(error, t));
    }
  };

  const deliver = async (lineId: string) => {
    const qty = Number.parseFloat((deliverQty[lineId] ?? "").replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) return;
    try {
      await deliverCamporeeSupplyLine(camporeeId, camporeeType, lineId, { qty });
      setDeliverQty((current) => ({ ...current, [lineId]: "" }));
      toast.success(t("toasts.delivered"));
      await load();
    } catch (error) {
      toast.error(getCamporeeSupplyUiErrorMessage(error, t));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("actions.refresh")}
        </Button>
      </div>

      {loading && !catalog ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-medium">{t("catalog.title")}</h3>
            <p className="text-muted-foreground text-sm">{t("catalog.hint")}</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="supply-cutoff">{t("catalog.cutoff")}</Label>
                <Input
                  id="supply-cutoff"
                  type="time"
                  value={cutoff}
                  onChange={(event) => setCutoff(event.target.value)}
                  disabled={!canConfigure}
                />
              </div>
              {canConfigure && (
                <Button type="button" size="sm" onClick={() => void saveCutoff()} disabled={saving}>
                  {t("actions.saveCutoff")}
                </Button>
              )}
            </div>

            {canConfigure && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="supply-slot-label">{t("catalog.slotLabel")}</Label>
                  <Input
                    id="supply-slot-label"
                    value={slotLabel}
                    onChange={(event) => setSlotLabel(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supply-slot-time">{t("catalog.slotTime")}</Label>
                  <Input
                    id="supply-slot-time"
                    type="time"
                    value={slotTime}
                    onChange={(event) => setSlotTime(event.target.value)}
                  />
                </div>
                <Button type="button" size="sm" onClick={() => void addSlot()} disabled={saving}>
                  {t("actions.addSlot")}
                </Button>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("catalog.slotLabel")}</th>
                    <th className="px-3 py-2 font-medium">{t("catalog.slotTime")}</th>
                    <th className="px-3 py-2 font-medium">{t("catalog.active")}</th>
                    {canConfigure && <th className="px-3 py-2 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {(catalog?.slots ?? []).map((slot) => (
                    <tr key={slot.slot_id} className="border-t">
                      <td className="px-3 py-2">{slot.label}</td>
                      <td className="px-3 py-2 font-mono">{slot.deliver_time}</td>
                      <td className="px-3 py-2">
                        {slot.active ? t("catalog.yes") : t("catalog.no")}
                      </td>
                      {canConfigure && (
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleSlot(slot.slot_id, !slot.active)}
                          >
                            {slot.active ? t("actions.deactivate") : t("actions.activate")}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canConfigure && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="supply-product-name">{t("catalog.productName")}</Label>
                  <Input
                    id="supply-product-name"
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supply-product-uom">{t("catalog.uom")}</Label>
                  <select
                    id="supply-product-uom"
                    className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                    value={productUom}
                    onChange={(event) => setProductUom(event.target.value as SupplyUom)}
                  >
                    {UOMS.map((uom) => (
                      <option key={uom} value={uom}>
                        {t(`uom.${uom}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supply-product-price">{t("catalog.unitPrice")}</Label>
                  <Input
                    id="supply-product-price"
                    inputMode="decimal"
                    placeholder="15.00"
                    value={productPrice}
                    onChange={(event) => setProductPrice(event.target.value)}
                  />
                </div>
                <Button type="button" size="sm" onClick={() => void addProduct()} disabled={saving}>
                  {t("actions.addProduct")}
                </Button>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("catalog.productName")}</th>
                    <th className="px-3 py-2 font-medium">{t("catalog.uom")}</th>
                    <th className="px-3 py-2 font-medium">{t("catalog.unitPrice")}</th>
                    <th className="px-3 py-2 font-medium">{t("catalog.active")}</th>
                    {canConfigure && <th className="px-3 py-2 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {(catalog?.products ?? []).map((product) => (
                    <tr key={product.product_id} className="border-t">
                      <td className="px-3 py-2">{product.name}</td>
                      <td className="px-3 py-2">{t(`uom.${product.uom as SupplyUom}`)}</td>
                      <td className="px-3 py-2">
                        {formatSupplyCentavos(product.unit_cost_centavos)}
                      </td>
                      <td className="px-3 py-2">
                        {product.active ? t("catalog.yes") : t("catalog.no")}
                      </td>
                      {canConfigure && (
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void toggleProduct(product.product_id, !product.active)
                            }
                          >
                            {product.active ? t("actions.deactivate") : t("actions.activate")}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">{t("plans.title")}</h3>
            <p className="text-muted-foreground text-sm">{t("plans.hint")}</p>
            {plans.length === 0 ? (
              <EmptyState icon={Inbox} title={t("plans.empty")} />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("plans.colClub")}</th>
                      <th className="px-3 py-2 font-medium">{t("plans.colStatus")}</th>
                      <th className="px-3 py-2 font-medium">{t("plans.colNet")}</th>
                      <th className="px-3 py-2 font-medium">{t("plans.colFolio")}</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => {
                      const principal = plan.payments.find((row) => row.kind === "PRINCIPAL");
                      return (
                        <tr key={plan.plan_id} className="border-t">
                          <td className="px-3 py-2">{plan.club_name}</td>
                          <td className="px-3 py-2">
                            <StatusBadge
                              intent={PLAN_STATUS_INTENT[plan.status]}
                              label={t(`status.${plan.status}`)}
                              size="sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {formatSupplyCentavos(plan.net_centavos)}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {principal?.folio_reference ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedPlanId(plan.plan_id)}
                            >
                              {t("actions.openDetail")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedPlan && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium">
                    {selectedPlan.club_name} · {t(`status.${selectedPlan.status}`)}
                  </h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedPlanId(null)}
                  >
                    {t("actions.close")}
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="text-left">
                      <tr>
                        <th className="px-2 py-1 font-medium">{t("plans.colDate")}</th>
                        <th className="px-2 py-1 font-medium">{t("plans.colSlot")}</th>
                        <th className="px-2 py-1 font-medium">{t("plans.colProduct")}</th>
                        <th className="px-2 py-1 font-medium">{t("plans.colQty")}</th>
                        <th className="px-2 py-1 font-medium">{t("plans.colDelivered")}</th>
                        {canDeliver && <th className="px-2 py-1 font-medium" />}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPlan.lines.map((line) => (
                        <tr key={line.line_id} className="border-t">
                          <td className="px-2 py-2">{line.date}</td>
                          <td className="px-2 py-2">
                            {line.slot_label} {line.deliver_time}
                          </td>
                          <td className="px-2 py-2">{line.product_name}</td>
                          <td className="px-2 py-2">{line.qty}</td>
                          <td className="px-2 py-2">{line.delivered_qty}</td>
                          {canDeliver && (
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  aria-label={t("plans.deliverQty")}
                                  className="w-24"
                                  inputMode="decimal"
                                  value={deliverQty[line.line_id] ?? ""}
                                  onChange={(event) =>
                                    setDeliverQty((current) => ({
                                      ...current,
                                      [line.line_id]: event.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void deliver(line.line_id)}
                                >
                                  {t("actions.deliver")}
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="px-2 py-1 font-medium">{t("plans.colFolio")}</th>
                      <th className="px-2 py-1 font-medium">{t("plans.colKind")}</th>
                      <th className="px-2 py-1 font-medium">{t("plans.colTotal")}</th>
                      <th className="px-2 py-1 font-medium">{t("plans.colPayStatus")}</th>
                      {canReviewPay && <th className="px-2 py-1 font-medium" />}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlan.payments.map((payment) => (
                      <tr key={payment.payment_id} className="border-t">
                        <td className="px-2 py-2 font-mono">{payment.folio_reference}</td>
                        <td className="px-2 py-2">{t(`kind.${payment.kind}`)}</td>
                        <td className="px-2 py-2">
                          {formatSupplyCentavos(payment.total_centavos)}
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge
                            intent={PAYMENT_STATUS_INTENT[payment.status]}
                            label={t(`payStatus.${payment.status}`)}
                            size="sm"
                          />
                        </td>
                        {canReviewPay && (
                          <td className="px-2 py-2 text-right">
                            {payment.status === "ISSUED" && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void markPaid(payment.payment_id)}
                              >
                                {t("actions.markPaid")}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">{t("reports.kitchen")}</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="supply-kitchen-date">{t("reports.date")}</Label>
                <Input
                  id="supply-kitchen-date"
                  type="date"
                  value={kitchenDate}
                  onChange={(event) => setKitchenDate(event.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("plans.colDate")}</th>
                    <th className="px-3 py-2 font-medium">{t("plans.colSlot")}</th>
                    <th className="px-3 py-2 font-medium">{t("plans.colProduct")}</th>
                    <th className="px-3 py-2 font-medium">{t("plans.colClub")}</th>
                    <th className="px-3 py-2 font-medium">{t("plans.colQty")}</th>
                    <th className="px-3 py-2 font-medium">{t("plans.colDelivered")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(kitchen?.rows ?? []).map((row, index) => (
                    <tr key={`${row.date}-${row.slot_label}-${row.product_name}-${index}`} className="border-t">
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">
                        {row.slot_label} {row.deliver_time}
                      </td>
                      <td className="px-3 py-2">{row.product_name}</td>
                      <td className="px-3 py-2">{row.club_name}</td>
                      <td className="px-3 py-2">{row.qty}</td>
                      <td className="px-3 py-2">{row.delivered_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">{t("reports.cash")}</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("plans.colClub")}</th>
                    <th className="px-3 py-2 font-medium">{t("reports.principal")}</th>
                    <th className="px-3 py-2 font-medium">{t("reports.charges")}</th>
                    <th className="px-3 py-2 font-medium">{t("reports.refunds")}</th>
                    <th className="px-3 py-2 font-medium">{t("reports.net")}</th>
                    <th className="px-3 py-2 font-medium">{t("reports.outstanding")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(cash?.sections ?? []).map((row) => (
                    <tr key={row.plan_id} className="border-t">
                      <td className="px-3 py-2">{row.club_name}</td>
                      <td className="px-3 py-2">
                        {formatSupplyCentavos(row.principal_centavos)}
                      </td>
                      <td className="px-3 py-2">
                        {formatSupplyCentavos(row.charges_centavos)}
                      </td>
                      <td className="px-3 py-2">
                        {formatSupplyCentavos(row.refunds_centavos)}
                      </td>
                      <td className="px-3 py-2">{formatSupplyCentavos(row.net_centavos)}</td>
                      <td className="px-3 py-2">
                        {formatSupplyCentavos(row.outstanding_centavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
