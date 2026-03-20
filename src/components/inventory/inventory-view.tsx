"use client";

import { useState, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventoryFormDialog } from "@/components/inventory/inventory-form-dialog";
import { DeleteInventoryDialog } from "@/components/inventory/delete-inventory-dialog";
import { apiRequestFromClient, ApiError } from "@/lib/api/client";
import type {
  InventoryItem,
  InventoryCategory,
  InstanceType,
} from "@/lib/api/inventory";
import { INSTANCE_TYPE_LABELS } from "@/lib/api/inventory";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Club = {
  club_id: number;
  name: string;
  club_type_id: number;
};

type AnyRecord = Record<string, unknown>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Map club_type_id (1=Aventureros, 2=Conquistadores, 3=Guías Mayores) to instanceType */
function clubTypeToInstanceType(clubTypeId: number): InstanceType {
  if (clubTypeId === 1) return "adv";
  if (clubTypeId === 3) return "mg";
  return "pathf";
}

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

function normalizeItem(raw: AnyRecord): InventoryItem {
  const category =
    raw.inventory_category && typeof raw.inventory_category === "object"
      ? (raw.inventory_category as AnyRecord)
      : null;

  return {
    inventory_id: Number(raw.inventory_id ?? raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: typeof raw.description === "string" ? raw.description : null,
    inventory_category_id: Number(raw.inventory_category_id ?? 0),
    inventory_category: category
      ? {
          inventory_category_id: Number(category.inventory_category_id ?? 0),
          name: String(category.name ?? ""),
          description:
            typeof category.description === "string" ? category.description : null,
        }
      : null,
    club_id: Number(raw.club_id ?? 0),
    amount: Number(raw.amount ?? 0),
    active: raw.active !== false,
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface InventoryViewProps {
  clubs: Club[];
  categories: InventoryCategory[];
  initialItems: InventoryItem[];
  initialClubId: number | null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function InventoryView({
  clubs,
  categories,
  initialItems,
  initialClubId,
}: InventoryViewProps) {
  const [selectedClubId, setSelectedClubId] = useState<number | null>(initialClubId);
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const selectedClub = clubs.find((c) => c.club_id === selectedClubId) ?? null;
  const instanceType: InstanceType = selectedClub
    ? clubTypeToInstanceType(selectedClub.club_type_id)
    : "pathf";

  const loadItems = useCallback(
    async (clubId: number, categoryId?: number | null) => {
      const club = clubs.find((c) => c.club_id === clubId);
      const instType = club ? clubTypeToInstanceType(club.club_type_id) : "pathf";

      setIsLoading(true);
      setLoadError(null);
      try {
        const params: Record<string, string | number> = {
          instanceType: instType,
        };
        if (categoryId) params.category = categoryId;

        const payload = await apiRequestFromClient<unknown>(
          `/inventory/clubs/${clubId}/inventory`,
          { params },
        );
        const raw = extractArray(payload);
        setItems(raw.map(normalizeItem));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los ítems del inventario";
        setLoadError(message);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [clubs],
  );

  function handleClubChange(value: string) {
    const clubId = Number(value);
    setSelectedClubId(clubId);
    setFilterCategoryId(null);
    loadItems(clubId, null);
  }

  function handleCategoryFilter(value: string) {
    const categoryId = value === "all" ? null : Number(value);
    setFilterCategoryId(categoryId);
    if (selectedClubId) {
      loadItems(selectedClubId, categoryId);
    }
  }

  function handleRefresh() {
    if (selectedClubId) {
      loadItems(selectedClubId, filterCategoryId);
    }
  }

  function handleCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function handleEdit(item: InventoryItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  function handleDelete(item: InventoryItem) {
    setDeletingItem(item);
    setDeleteOpen(true);
  }

  function handleSuccess() {
    if (selectedClubId) {
      loadItems(selectedClubId, filterCategoryId);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Club selector */}
          <Select
            value={selectedClubId ? String(selectedClubId) : ""}
            onValueChange={handleClubChange}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Seleccionar club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club) => (
                <SelectItem key={club.club_id} value={String(club.club_id)}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={filterCategoryId ? String(filterCategoryId) : "all"}
            onValueChange={handleCategoryFilter}
            disabled={!selectedClubId}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem
                  key={cat.inventory_category_id}
                  value={String(cat.inventory_category_id)}
                >
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={!selectedClubId || isLoading}
            title="Actualizar"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Actualizar</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedClub && (
            <span className="text-xs text-muted-foreground">
              {INSTANCE_TYPE_LABELS[instanceType]}
            </span>
          )}
          <Button onClick={handleCreate} disabled={!selectedClubId} size="sm">
            <Plus className="size-4" />
            Nuevo ítem
          </Button>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Count */}
      {selectedClubId && !loadError && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{items.length}</span>{" "}
          {items.length === 1 ? "ítem encontrado" : "ítems encontrados"}
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Cargando inventario...
        </div>
      ) : (
        <InventoryTable
          items={items}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Dialogs */}
      <InventoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clubId={selectedClubId ?? 0}
        instanceType={instanceType}
        categories={categories}
        item={editingItem}
        onSuccess={handleSuccess}
      />

      <DeleteInventoryDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={deletingItem}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
