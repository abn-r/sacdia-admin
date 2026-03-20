"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigTable } from "@/components/investiture/config-table";
import { ConfigFormDialog } from "@/components/investiture/config-form-dialog";
import { DeleteConfigDialog } from "@/components/investiture/delete-config-dialog";
import { getInvestitureConfigs, type InvestitureConfig } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigClientPageProps {
  initialConfigs: InvestitureConfig[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfigClientPage({ initialConfigs }: ConfigClientPageProps) {
  const [configs, setConfigs] = useState<InvestitureConfig[]>(initialConfigs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<InvestitureConfig | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState<InvestitureConfig | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getInvestitureConfigs();
      setConfigs(Array.isArray(fresh) ? fresh : []);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudieron actualizar las configuraciones";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  function openCreate() {
    setEditingConfig(null);
    setFormOpen(true);
  }

  function openEdit(config: InvestitureConfig) {
    setEditingConfig(config);
    setFormOpen(true);
  }

  function openDelete(config: InvestitureConfig) {
    setDeletingConfig(config);
    setDeleteOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{configs.length}</span>{" "}
            {configs.length === 1 ? "configuración" : "configuraciones"}
          </p>
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

        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nueva configuración
        </Button>
      </div>

      {/* Table */}
      <ConfigTable configs={configs} onEdit={openEdit} onDelete={openDelete} />

      {/* Create / Edit dialog */}
      <ConfigFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        config={editingConfig}
        onSuccess={refresh}
      />

      {/* Delete (soft) dialog */}
      <DeleteConfigDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        config={deletingConfig}
        onSuccess={refresh}
      />
    </div>
  );
}
