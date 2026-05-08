"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SystemConfigTable } from "@/components/system-config/system-config-table";
import { SystemConfigEditDialog } from "@/components/system-config/system-config-edit-dialog";
import { getSystemConfigs, type SystemConfig } from "@/lib/api/system-config";
import { ApiError } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPrefix(key: string): string {
  const dot = key.indexOf(".");
  return dot !== -1 ? key.slice(0, dot) : key;
}

function groupByPrefix(configs: SystemConfig[]): Map<string, SystemConfig[]> {
  const groups = new Map<string, SystemConfig[]>();
  for (const config of configs) {
    const prefix = getPrefix(config.key);
    const existing = groups.get(prefix) ?? [];
    existing.push(config);
    groups.set(prefix, existing);
  }
  return groups;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemConfigClientPageProps {
  initialConfigs: SystemConfig[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SystemConfigClientPage({ initialConfigs }: SystemConfigClientPageProps) {
  const t = useTranslations("system_config.client");
  const [configs, setConfigs] = useState<SystemConfig[]>(initialConfigs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getSystemConfigs();
      setConfigs(fresh);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("error_refresh");
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [t]);

  function openEdit(config: SystemConfig) {
    setEditingConfig(config);
    setEditOpen(true);
  }

  const groups = groupByPrefix(configs);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("entry_count", { count: configs.length })}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t("btn_refresh")}
        </Button>
      </div>

      {/* Grouped tables */}
      {groups.size === 0 && (
        <SystemConfigTable configs={[]} onEdit={openEdit} />
      )}

      {Array.from(groups.entries()).map(([prefix, groupConfigs]) => (
        <div key={prefix} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {prefix}
          </h2>
          <SystemConfigTable configs={groupConfigs} onEdit={openEdit} />
        </div>
      ))}

      {/* Edit dialog */}
      <SystemConfigEditDialog
        open={editOpen}
        config={editingConfig}
        onOpenChange={setEditOpen}
        onSuccess={refresh}
      />
    </div>
  );
}
