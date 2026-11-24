"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, RefreshCw, Shield } from "lucide-react";

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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { SettingsRow, SettingsSection } from "@/components/shared/settings-rows";
import {
  createInsuranceProduct,
  listInsuranceProducts,
  updateInsuranceProduct,
  type InsuranceCoverageScope,
  type InsuranceProduct,
  type InsuranceValidityMode,
} from "@/lib/api/insurance-config";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";

type ProductForm = {
  name: string;
  coverage_scope: InsuranceCoverageScope;
  validity_mode: InsuranceValidityMode;
  default_duration_months: string;
};

const EMPTY_PRODUCT: ProductForm = {
  name: "",
  coverage_scope: "GENERAL",
  validity_mode: "FIXED_MONTHS",
  default_duration_months: "12",
};

interface InsuranceConfigPanelProps {
  /** Local field to configure; undefined = the caller's own (local field roles). */
  localFieldId?: number;
}

export function InsuranceProductsPanel({
  localFieldId,
}: InsuranceConfigPanelProps) {
  const t = useTranslations("insurance_config");
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [deactivating, setDeactivating] = useState<InsuranceProduct | null>(null);
  const tc = useTranslations("ops.club.insurance.config");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listInsuranceProducts(localFieldId));
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t, "toasts.loadFailed"));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [t, localFieldId]);

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
        await updateInsuranceProduct(editing.insurance_product_id, body, localFieldId);
      } else {
        await createInsuranceProduct(body, localFieldId);
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

  const setActive = async (product: InsuranceProduct, active: boolean) => {
    try {
      await updateInsuranceProduct(product.insurance_product_id, { active }, localFieldId);
      await load();
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
      // ConfirmDialog keeps itself open and shows the failure.
      throw error instanceof Error ? error : new Error(t("toasts.loadFailed"));
    }
  };

  return (
    <>
      <SettingsSection title={t("tabs.products")} description={t("products.description")}>
        {loading ? (
          <p className="px-5 py-4 text-muted-foreground text-sm">{t("loading")}</p>
        ) : products.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={Shield} title={t("products.empty")} />
          </div>
        ) : (
          products.map((product) => (
            <SettingsRow
              key={product.insurance_product_id}
              label={
                <span className="flex flex-wrap items-center gap-2">
                  {product.name}
                  <ExceptionStatus<"active" | "inactive">
                    value={product.active ? "active" : "inactive"}
                    normal={["active"]}
                    labels={{ active: t("products.active"), inactive: t("products.inactive") }}
                    intents={{ inactive: "neutral" }}
                  />
                </span>
              }
              description={[
                product.coverage_scope === "EVENT" ? t("products.scopeEvent") : t("products.scopeGeneral"),
                `${
                  product.validity_mode === "EVENT_DATES"
                    ? t("products.validityEventDates")
                    : t("products.validityFixedMonths")
                }${product.default_duration_months ? ` (${product.default_duration_months}m)` : ""}`,
              ].join(" · ")}
              control={
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(product)}>
                    {t("products.edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (product.active) setDeactivating(product);
                      else void setActive(product, true).catch(() => undefined);
                    }}
                  >
                    {product.active ? t("products.deactivate") : t("products.activate")}
                  </Button>
                </div>
              }
            />
          ))
        )}
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="size-4" />
            <span className="sr-only">{tc("refresh")}</span>
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            {t("products.create")}
          </Button>
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        title={tc("products.deactivateTitle", { name: deactivating?.name ?? "" })}
        description={tc("products.deactivateDescription")}
        confirmLabel={t("products.deactivate")}
        tone="destructive"
        onConfirm={async () => {
          if (deactivating) await setActive(deactivating, false);
        }}
      />

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
                    coverage_scope: event.target.value as InsuranceCoverageScope,
                  }))
                }
              >
                <option value="GENERAL">{t("products.scopeGeneral")}</option>
                <option value="EVENT">{t("products.scopeEvent")}</option>
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
                    validity_mode: event.target.value as InsuranceValidityMode,
                  }))
                }
              >
                <option value="FIXED_MONTHS">
                  {t("products.validityFixedMonths")}
                </option>
                <option value="EVENT_DATES">
                  {t("products.validityEventDates")}
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
              loading={saving}
              type="button"
              onClick={() => void save()}
              disabled={!form.name.trim()}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
