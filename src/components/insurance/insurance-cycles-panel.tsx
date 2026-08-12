"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarClock, Loader2, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createInsuranceCycle,
  listInsuranceCycles,
  listInsuranceProducts,
  updateInsuranceCycle,
  type InsuranceCycleConfig,
  type InsuranceProduct,
} from "@/lib/api/insurance-config";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";

type CycleForm = {
  insurance_product_id: string;
  ecclesiastical_year_id: string;
  club_type_id: string;
  unit_cost: string;
  purchase_deadline: string;
  timezone: string;
};

const EMPTY_CYCLE: CycleForm = {
  insurance_product_id: "",
  ecclesiastical_year_id: "",
  club_type_id: "",
  unit_cost: "",
  purchase_deadline: "",
  timezone: "America/Mexico_City",
};

export function InsuranceCyclesPanel() {
  const t = useTranslations("insurance_config");
  const [cycles, setCycles] = useState<InsuranceCycleConfig[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceCycleConfig | null>(null);
  const [form, setForm] = useState<CycleForm>(EMPTY_CYCLE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cyclesData, productsData] = await Promise.all([
        listInsuranceCycles(),
        listInsuranceProducts(),
      ]);
      setCycles(cyclesData);
      setProducts(productsData);
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t, "toasts.loadFailed"));
      setCycles([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const productName = (productId: number) =>
    products.find((product) => product.insurance_product_id === productId)
      ?.name ?? `#${productId}`;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_CYCLE);
    setDialogOpen(true);
  };

  const openEdit = (cycle: InsuranceCycleConfig) => {
    setEditing(cycle);
    setForm({
      insurance_product_id: String(cycle.insurance_product_id),
      ecclesiastical_year_id: String(cycle.ecclesiastical_year_id),
      club_type_id: String(cycle.club_type_id),
      unit_cost: String(cycle.unit_cost),
      purchase_deadline: cycle.purchase_deadline.slice(0, 10),
      timezone: cycle.timezone,
    });
    setDialogOpen(true);
  };

  const canSave = editing
    ? Boolean(form.unit_cost && form.purchase_deadline)
    : Boolean(
        form.insurance_product_id &&
          form.ecclesiastical_year_id &&
          form.club_type_id &&
          form.unit_cost &&
          form.purchase_deadline,
      );

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateInsuranceCycle(editing.insurance_cycle_config_id, {
          unit_cost: Number(form.unit_cost),
          purchase_deadline: form.purchase_deadline,
          timezone: form.timezone,
        });
      } else {
        await createInsuranceCycle({
          insurance_product_id: Number(form.insurance_product_id),
          ecclesiastical_year_id: Number(form.ecclesiastical_year_id),
          club_type_id: Number(form.club_type_id),
          unit_cost: Number(form.unit_cost),
          purchase_deadline: form.purchase_deadline,
          timezone: form.timezone,
        });
      }
      toast.success(t("cycles.saved"));
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof CycleForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {t("cycles.description")}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            {t("cycles.create")}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : cycles.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t("cycles.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("cycles.colProduct")}
                </th>
                <th className="px-3 py-2 font-medium">{t("cycles.colYear")}</th>
                <th className="px-3 py-2 font-medium">
                  {t("cycles.colClubType")}
                </th>
                <th className="px-3 py-2 font-medium">{t("cycles.colCost")}</th>
                <th className="px-3 py-2 font-medium">
                  {t("cycles.colDeadline")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("cycles.colActive")}
                </th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr key={cycle.insurance_cycle_config_id} className="border-t">
                  <td className="px-3 py-2">
                    {cycle.product?.name ??
                      productName(cycle.insurance_product_id)}
                  </td>
                  <td className="px-3 py-2">{cycle.ecclesiastical_year_id}</td>
                  <td className="px-3 py-2">{cycle.club_type_id}</td>
                  <td className="px-3 py-2">${cycle.unit_cost}</td>
                  <td className="px-3 py-2">
                    {cycle.purchase_deadline.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      intent={cycle.active ? "success" : "neutral"}
                      label={
                        cycle.active
                          ? t("products.active")
                          : t("products.inactive")
                      }
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(cycle)}
                    >
                      {t("products.edit")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t("cycles.editTitle") : t("cycles.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cycle-product">
                    {t("cycles.colProduct")}
                  </Label>
                  <select
                    id="cycle-product"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={form.insurance_product_id}
                    onChange={set("insurance_product_id")}
                  >
                    <option value="">{t("cycles.selectProduct")}</option>
                    {products
                      .filter((product) => product.active)
                      .map((product) => (
                        <option
                          key={product.insurance_product_id}
                          value={product.insurance_product_id}
                        >
                          {product.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cycle-year">{t("cycles.colYear")}</Label>
                    <Input
                      id="cycle-year"
                      type="number"
                      value={form.ecclesiastical_year_id}
                      onChange={set("ecclesiastical_year_id")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cycle-club-type">
                      {t("cycles.colClubType")}
                    </Label>
                    <Input
                      id="cycle-club-type"
                      type="number"
                      value={form.club_type_id}
                      onChange={set("club_type_id")}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cycle-cost">{t("cycles.colCost")}</Label>
                <Input
                  id="cycle-cost"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.unit_cost}
                  onChange={set("unit_cost")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cycle-deadline">
                  {t("cycles.colDeadline")}
                </Label>
                <Input
                  id="cycle-deadline"
                  type="date"
                  value={form.purchase_deadline}
                  onChange={set("purchase_deadline")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle-timezone">{t("cycles.timezone")}</Label>
              <Input
                id="cycle-timezone"
                value={form.timezone}
                onChange={set("timezone")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving || !canSave}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
