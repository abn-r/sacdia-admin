"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getPaymentOrdersReviewQueue,
  listPaymentOrders,
  type PaymentOrder,
} from "@/lib/api/field-payment-orders";

export interface PaymentOrdersData {
  orders: PaymentOrder[];
  /** Latest proof upload per order id (only known for orders under review). */
  proofDates: Map<string, string>;
  /** First load in flight and nothing to show yet. */
  loading: boolean;
  /** The load failed and there is nothing to show: render an error, not an empty list. */
  error: unknown;
  /**
   * The full list failed but the review queue loaded: only "Por revisar" is
   * reliable, the other tabs must show the error.
   */
  listError: unknown;
  /** A reload failed while older data is still on screen. */
  stale: boolean;
  /** When the data on screen was fetched. */
  updatedAt: Date | null;
  reload: () => Promise<void>;
}

const NO_ERROR = null;

/**
 * One request pair feeds every tab: the full list (counts and the other tabs)
 * and the review queue (which carries the proofs, so the wait is measured from
 * the upload and not from the issue date).
 */
export function usePaymentOrdersData(enabled: boolean): PaymentOrdersData {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [proofDates, setProofDates] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(NO_ERROR);
  const [listError, setListError] = useState<unknown>(NO_ERROR);
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const hasData = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const [list, queue] = await Promise.allSettled([
      listPaymentOrders(),
      getPaymentOrdersReviewQueue(),
    ]);

    if (list.status === "rejected" && queue.status === "rejected") {
      if (hasData.current) {
        setStale(true);
      } else {
        setError(list.reason);
      }
      setLoading(false);
      return;
    }

    const dates = new Map<string, string>();
    if (queue.status === "fulfilled") {
      for (const order of queue.value) {
        const uploaded = order.proofs?.[0]?.created_at;
        if (uploaded) dates.set(order.field_payment_order_id, uploaded);
      }
    }

    setOrders(
      list.status === "fulfilled"
        ? list.value
        : queue.status === "fulfilled"
          ? queue.value
          : [],
    );
    setProofDates(dates);
    setListError(list.status === "rejected" ? list.reason : NO_ERROR);
    setError(NO_ERROR);
    setStale(false);
    setUpdatedAt(new Date());
    hasData.current = true;
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    // Data fetching on mount: state is set after the requests settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return {
    orders,
    proofDates,
    loading,
    error,
    listError,
    stale,
    updatedAt,
    reload,
  };
}
