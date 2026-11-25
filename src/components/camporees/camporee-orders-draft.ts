"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCamporeeOrderOfferings,
  listCamporeeOrderProducts,
  replaceCamporeeOrderOfferings,
  updateCamporeeOrderSettings,
} from "@/lib/api/camporee-orders";
import type { CamporeeKind, CamporeeOrderOffering } from "@/lib/types/camporee-orders";
import { toApiDateTime, toDateTimeInput } from "@/lib/camporees/form";

export type OrderOfferingRow = {
  product_id: string;
  title: string;
  pricePesos: string;
  active: boolean;
  sort_order: number;
};

export type OrdersDraft = {
  enabled: boolean;
  opensAt: string;
  deadline: string;
  rows: OrderOfferingRow[];
};

const EMPTY: OrdersDraft = { enabled: false, opensAt: "", deadline: "", rows: [] };

const snapshot = (draft: OrdersDraft) => JSON.stringify(draft);

/** Rows to send: only the active ones with a price above zero. */
export function offeringsToSave(rows: OrderOfferingRow[]) {
  return rows
    .filter((row) => row.active)
    .map((row) => {
      const pesos = Number.parseFloat(row.pricePesos.replace(",", "."));
      return {
        product_id: row.product_id,
        price_centavos: Math.round(pesos * 100),
        active: row.active,
        sort_order: row.sort_order,
      };
    })
    .filter((item) => Number.isFinite(item.price_centavos) && item.price_centavos > 0);
}

/**
 * Draft of the camporee's merchandise-order settings. It lives inside the
 * camporee form so the orders save together with the rest instead of with a
 * button of their own.
 */
export function useCamporeeOrdersDraft({
  camporeeId,
  kind,
  initial,
  canConfigure,
}: {
  camporeeId: number | null;
  kind: CamporeeKind;
  initial: { enabled: boolean; opensAt: string | null | undefined; deadline: string | null | undefined };
  canConfigure: boolean;
}) {
  const [draft, setDraft] = useState<OrdersDraft>({
    ...EMPTY,
    enabled: initial.enabled,
    opensAt: toDateTimeInput(initial.opensAt),
    deadline: toDateTimeInput(initial.deadline),
  });
  const [baseline, setBaseline] = useState(() => snapshot(draft));
  const [loading, setLoading] = useState(canConfigure);
  const [loadError, setLoadError] = useState<unknown>(null);
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;

  const load = useCallback(async () => {
    if (!canConfigure) return;
    setLoading(true);
    setLoadError(null);
    try {
      const products = await listCamporeeOrderProducts({ active: true });
      const catalog =
        camporeeId != null ? await getCamporeeOrderOfferings(camporeeId, kind) : null;
      const byProduct = new Map(
        (catalog?.items ?? []).map((item: CamporeeOrderOffering) => [item.product_id, item]),
      );
      const next: OrdersDraft = {
        enabled: catalog?.settings.orders_enabled ?? initial.enabled,
        opensAt: toDateTimeInput(catalog?.settings.orders_opens_at ?? initial.opensAt),
        deadline: toDateTimeInput(catalog?.settings.orders_deadline ?? initial.deadline),
        rows: products.map((product, index) => {
          const offering = byProduct.get(product.camporee_order_product_id);
          return {
            product_id: product.camporee_order_product_id,
            title: product.title,
            pricePesos: offering ? (offering.price_centavos / 100).toFixed(2) : "",
            active: offering?.active ?? false,
            sort_order: offering?.sort_order ?? index,
          };
        }),
      };
      setDraft(next);
      setBaseline(snapshot(next));
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
    }
    // `initial` only seeds the first paint; the server copy wins once loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camporeeId, kind, canConfigure]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => canConfigure && !loading && !loadError && snapshot(draft) !== baseline,
    [canConfigure, loading, loadError, draft, baseline],
  );

  /** Saves the settings and the offerings for `targetId` (the new id after a create). */
  const save = useCallback(
    async (targetId: number) => {
      await updateCamporeeOrderSettings(targetId, kind, {
        orders_enabled: draft.enabled,
        orders_opens_at: draft.opensAt ? toApiDateTime(draft.opensAt) : null,
        orders_deadline: draft.deadline ? toApiDateTime(draft.deadline) : null,
      });
      await replaceCamporeeOrderOfferings(targetId, kind, offeringsToSave(draft.rows));
      setBaseline(snapshot(draft));
    },
    [draft, kind],
  );

  return { draft, setDraft, loading, loadError, reload: load, dirty, save };
}
