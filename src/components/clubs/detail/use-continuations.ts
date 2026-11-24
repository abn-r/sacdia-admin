"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listAnnualContinuationsFromClient,
  type ContinuationListItem,
} from "@/lib/api/annual-continuations";

export type ContinuationsState = {
  items: ContinuationListItem[];
  loading: boolean;
  failed: boolean;
  reload: () => Promise<void>;
};

/** Candidates for the annual enrollment of one section. Skipped when `enabled` is false. */
export function useContinuations(sectionId: number, enabled: boolean): ContinuationsState {
  const [items, setItems] = useState<ContinuationListItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setFailed(false);
    try {
      setItems(await listAnnualContinuationsFromClient(sectionId, { limit: 100 }));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [sectionId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, failed, reload };
}
