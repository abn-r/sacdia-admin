"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCamporeeOrderOfferings,
  listCamporeeOrderProducts,
  replaceCamporeeOrderOfferings,
  updateCamporeeOrderSettings,
} from "@/lib/api/camporee-orders";
import type {
  CamporeeOrderOffering,
  CamporeeKind,
} from "@/lib/types/camporee-orders";
import { getCamporeeOrderUiErrorMessage } from "@/components/camporee-orders/camporee-order-errors";

function toDateTimeInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr.slice(0, 16);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toApiDateTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

type OfferingRow = {
  product_id: string;
  title: string;
  pricePesos: string;
  active: boolean;
  sort_order: number;
};

interface CamporeeOrderSettingsPanelProps {
  camporeeId: number;
  kind: CamporeeKind;
  ordersEnabled?: boolean;
  ordersOpensAt?: string | null;
  ordersDeadline?: string | null;
  canConfigure: boolean;
}

export function CamporeeOrderSettingsPanel({
  camporeeId,
  kind,
  ordersEnabled = false,
  ordersOpensAt = null,
  ordersDeadline = null,
  canConfigure,
}: CamporeeOrderSettingsPanelProps) {
  const t = useTranslations("camporee_orders");
  const [enabled, setEnabled] = useState(ordersEnabled);
  const [opensAt, setOpensAt] = useState(toDateTimeInput(ordersOpensAt));
  const [deadline, setDeadline] = useState(toDateTimeInput(ordersDeadline));
  const [rows, setRows] = useState<OfferingRow[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadOfferings = useCallback(async () => {
    if (!canConfigure) return;
    setLoadingOfferings(true);
    try {
      const catalog = await getCamporeeOrderOfferings(camporeeId, kind);
      const products = await listCamporeeOrderProducts({ active: true });
      setEnabled(catalog.settings.orders_enabled);
      setOpensAt(toDateTimeInput(catalog.settings.orders_opens_at));
      setDeadline(toDateTimeInput(catalog.settings.orders_deadline));
      const offeringByProduct = new Map(
        catalog.items.map((item: CamporeeOrderOffering) => [item.product_id, item]),
      );
      setRows(
        products.map((product, index) => {
          const offering = offeringByProduct.get(product.camporee_order_product_id);
          return {
            product_id: product.camporee_order_product_id,
            title: product.title,
            pricePesos: offering
              ? (offering.price_centavos / 100).toFixed(2)
              : "",
            active: offering?.active ?? false,
            sort_order: offering?.sort_order ?? index,
          };
        }),
      );
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t, "toasts.loadFailed"));
    } finally {
      setLoadingOfferings(false);
    }
  }, [camporeeId, kind, canConfigure, t]);

  useEffect(() => {
    setEnabled(ordersEnabled);
    setOpensAt(toDateTimeInput(ordersOpensAt));
    setDeadline(toDateTimeInput(ordersDeadline));
  }, [ordersEnabled, ordersOpensAt, ordersDeadline]);

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings]);

  const saveAll = async () => {
    setSaving(true);
    try {
      await updateCamporeeOrderSettings(camporeeId, kind, {
        orders_enabled: enabled,
        orders_opens_at: toApiDateTime(opensAt),
        orders_deadline: toApiDateTime(deadline),
      });
      const items = rows
        .filter((row) => row.active)
        .map((row) => {
          const pesos = Number.parseFloat(row.pricePesos.replace(",", "."));
          const price_centavos = Math.round(pesos * 100);
          return {
            product_id: row.product_id,
            price_centavos,
            active: row.active,
            sort_order: row.sort_order,
          };
        })
        .filter((item) => item.price_centavos > 0);
      await replaceCamporeeOrderOfferings(camporeeId, kind, items);
      toast.success(t("settings.saved"));
      await loadOfferings();
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  if (!canConfigure) return null;

  return (
    <div className="space-y-4 rounded-md border border-border p-4">
      <div>
        <p className="font-medium text-sm">{t("settings.title")}</p>
        <p className="text-muted-foreground text-xs">{t("settings.description")}</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="orders-enabled"
          checked={enabled}
          onCheckedChange={(checked) => setEnabled(checked === true)}
        />
        <Label htmlFor="orders-enabled" className="font-normal">
          {t("settings.enabled")}
        </Label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="orders-opens">{t("settings.opensAt")}</Label>
          <Input
            id="orders-opens"
            type="datetime-local"
            value={opensAt}
            onChange={(event) => setOpensAt(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="orders-deadline">{t("settings.deadline")}</Label>
          <Input
            id="orders-deadline"
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-sm">{t("settings.offeringsTitle")}</p>
        {loadingOfferings ? (
          <p className="text-muted-foreground text-sm">{t("tray.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("settings.offeringsEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                key={row.product_id}
                className="grid grid-cols-[auto_1fr_120px] items-center gap-2 rounded-md border p-2"
              >
                <Checkbox
                  checked={row.active}
                  onCheckedChange={(checked) => {
                    setRows((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, active: checked === true } : item,
                      ),
                    );
                  }}
                  aria-label={row.title}
                />
                <span className="truncate text-sm">{row.title}</span>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={row.pricePesos}
                  disabled={!row.active}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRows((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, pricePesos: value } : item,
                      ),
                    );
                  }}
                  aria-label={t("settings.priceLabel", { product: row.title })}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="button" disabled={saving} onClick={() => void saveAll()}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("settings.save")}
      </Button>
    </div>
  );
}
