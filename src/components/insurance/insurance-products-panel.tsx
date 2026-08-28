"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Shield } from "lucide-react";

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
  createInsuranceProduct,
  listInsuranceProducts,
  updateInsuranceProduct,
  type InsuranceProduct,
} from "@/lib/api/insurance-config";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";

type ProductForm = {
  name: string;
  coverage_scope: string;
  validity_mode: string;
  default_duration_months: string;
};

const EMPTY_PRODUCT: ProductForm = {
  name: "",
  coverage_scope: "MEMBER",
  validity_mode: "FIXED_MONTHS",
  default_duration_months: "12",
};

export function InsuranceProductsPanel() {
  const t = useTranslations("insurance_config");
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listInsuranceProducts());
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t, "toasts.loadFailed"));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PRODUCT);
    setDialogOpen(true);
  };

  const openEdit = (product: InsuranceProduct) => {
    setEditing(product);
    setForm({
      name: product.name,
      coverage_scope: product.coverage_scope,
      validity_mode: product.validity_mode,
      default_duration_months: product.default_duration_months
        ? String(product.default_duration_months)
        : "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        coverage_scope: form.coverage_scope,
        validity_mode: form.validity_mode,
        default_duration_months: form.default_duration_months
          ? Number(form.default_duration_months)
          : undefined,
      };
      if (editing) {
        await updateInsuranceProduct(editing.insurance_product_id, body);
      } else {
        await createInsuranceProduct(body);
      }
      toast.success(t("products.saved"));
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: InsuranceProduct) => {
    try {
      await updateInsuranceProduct(product.insurance_product_id, {
        active: !product.active,
      });
      await load();
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {t("products.description")}
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
            {t("products.create")}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : products.length === 0 ? (
        <EmptyState icon={Shield} title={t("products.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("products.colName")}</th>
                <th className="px-3 py-2 font-medium">
                  {t("products.colScope")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("products.colValidity")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("products.colActive")}
                </th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.insurance_product_id} className="border-t">
                  <td className="px-3 py-2">{product.name}</td>
                  <td className="px-3 py-2">{product.coverage_scope}</td>
                  <td className="px-3 py-2">
                    {product.validity_mode}
                    {product.default_duration_months
                      ? ` (${product.default_duration_months}m)`
                      : ""}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      intent={product.active ? "success" : "neutral"}
                      label={
                        product.active
                          ? t("products.active")
                          : t("products.inactive")
                      }
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(product)}
                      >
                        {t("products.edit")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleActive(product)}
                      >
                        {product.active
                          ? t("products.deactivate")
                          : t("products.activate")}
                      </Button>
                    </div>
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
              {editing ? t("products.editTitle") : t("products.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">{t("products.colName")}</Label>
              <Input
                id="product-name"
                value={form.name}
                maxLength={255}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-scope">{t("products.colScope")}</Label>
              <select
                id="product-scope"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.coverage_scope}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    coverage_scope: event.target.value,
                  }))
                }
              >
                <option value="MEMBER">{t("products.scopeMember")}</option>
                <option value="EVENT_EXTERNAL">
                  {t("products.scopeEventExternal")}
                </option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-validity">
                {t("products.colValidity")}
              </Label>
              <select
                id="product-validity"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.validity_mode}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    validity_mode: event.target.value,
                  }))
                }
              >
                <option value="FIXED_MONTHS">
                  {t("products.validityFixedMonths")}
                </option>
                <option value="UNTIL_DATE">
                  {t("products.validityUntilDate")}
                </option>
              </select>
            </div>
            {form.validity_mode === "FIXED_MONTHS" && (
              <div className="space-y-1.5">
                <Label htmlFor="product-duration">
                  {t("products.durationMonths")}
                </Label>
                <Input
                  id="product-duration"
                  type="number"
                  min={1}
                  value={form.default_duration_months}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      default_duration_months: event.target.value,
                    }))
                  }
                />
              </div>
            )}
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
              disabled={saving || !form.name.trim()}
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
