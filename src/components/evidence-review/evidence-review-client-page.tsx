"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvidenceReviewTable } from "@/components/evidence-review/evidence-review-table";
import {
  getEvidencePending,
  type EvidenceItem,
  type EvidenceType,
} from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = EvidenceType | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "folder", label: "Carpetas" },
  { key: "class", label: "Clases" },
  { key: "honor", label: "Honores" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPending(item: EvidenceItem): boolean {
  if (item.type === "honor") return item.status === "in_progress";
  return item.status === "pendiente";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvidenceReviewClientPageProps {
  initialItems: EvidenceItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvidenceReviewClientPage({
  initialItems,
}: EvidenceReviewClientPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [items, setItems] = useState<EvidenceItem[]>(initialItems);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const type = activeTab === "all" ? undefined : (activeTab as EvidenceType);
      const result = await getEvidencePending(type, 1, 200);
      if (isMounted.current) {
        setItems(result.data);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo actualizar la lista";
      toast.error(message);
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  }, [activeTab]);

  // Reload data when tab changes
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Filter items for current tab ──────────────────────────────────────────
  const visibleItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item.type === activeTab);

  function countForTab(key: TabKey): number {
    const filtered = key === "all" ? items : items.filter((i) => i.type === key);
    // Count only pending items for badge
    return filtered.filter(isPending).length;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {/* Type tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
      >
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="gap-4">
            {TABS.map(({ key, label }) => {
              const pendingCount = countForTab(key);
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="whitespace-nowrap"
                >
                  {label}
                  {pendingCount > 0 && (
                    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary/10 px-1 text-xs font-semibold text-primary">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {TABS.map(({ key }) => (
          <TabsContent key={key} value={key} className="mt-4">
            <EvidenceReviewTable
              items={visibleItems}
              onRefresh={refresh}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
