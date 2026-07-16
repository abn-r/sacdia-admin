"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
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
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import { INSTANCE_TYPE_LABELS } from "@/lib/api/inventory";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Club = {
  club_id: number;
  name: string;
  club_type_id: number;
  local_field_id?: number;
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
  localFields: LocalField[];
  clubTypes: ClubType[];
  territoryScope: AdminTerritoryScope;
  initialItems: InventoryItem[];
  initialClubId: number | null;
  initialLocalFieldId: number | "all";
  initialClubTypeId: number | "all";
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function InventoryView({
  clubs,
  categories,
  localFields,
  clubTypes,
  territoryScope,
  initialItems,
  initialClubId,
  initialLocalFieldId,
  initialClubTypeId,
}: InventoryViewProps) {
  const t = useTranslations("inventory");
  const isLocalFieldLocked = territoryScope.level === "local_field";
  const [selectedLocalFieldId, setSelectedLocalFieldId] = useState<number | "all">(
    isLocalFieldLocked ? territoryScope.localFieldId : initialLocalFieldId,
  );
  const [selectedClubTypeId, setSelectedClubTypeId] = useState<number | "all">(
    initialClubTypeId,
  );
  const [selectedClubId, setSelectedClubId] = useState<number | null>(initialClubId);
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const filteredClubs = clubs.filter((club) => {
    if (
      selectedLocalFieldId !== "all" &&
      club.local_field_id !== selectedLocalFieldId
    ) {
      return false;
    }
    if (
      selectedClubTypeId !== "all" &&
      club.club_type_id !== selectedClubTypeId
    ) {
      return false;
    }
    return true;
  });

  const selectedClub =
    filteredClubs.find((c) => c.club_id === selectedClubId) ??
    clubs.find((c) => c.club_id === selectedClubId) ??
    null;
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
            : t("errors.load_items_failed");
        setLoadError(message);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [clubs, t],
  );

  function selectClubAndLoad(clubId: number, categoryId: number | null = null) {
    setSelectedClubId(clubId);
    setFilterCategoryId(categoryId);
    loadItems(clubId, categoryId);
  }

  function applyClubFilters(
    localFieldId: number | "all",
    clubTypeId: number | "all",
  ) {
    const nextClubs = clubs.filter((club) => {
      if (localFieldId !== "all" && club.local_field_id !== localFieldId) {
        return false;
      }
      if (clubTypeId !== "all" && club.club_type_id !== clubTypeId) {
        return false;
      }
      return true;
    });

    if (nextClubs.length === 0) {
      setSelectedClubId(null);
      setItems([]);
      setLoadError(null);
      return;
    }

    const currentClubStillValid = nextClubs.some(
      (club) => club.club_id === selectedClubId,
    );
    const nextClubId = currentClubStillValid
      ? (selectedClubId as number)
      : nextClubs[0].club_id;
    selectClubAndLoad(nextClubId, null);
  }

  function handleLocalFieldChange(value: string) {
    const nextLocalFieldId = value === "all" ? "all" : Number(value);
    setSelectedLocalFieldId(nextLocalFieldId);
    applyClubFilters(nextLocalFieldId, selectedClubTypeId);
  }

  function handleClubTypeChange(value: string) {
    const nextClubTypeId = value === "all" ? "all" : Number(value);
    setSelectedClubTypeId(nextClubTypeId);
    applyClubFilters(selectedLocalFieldId, nextClubTypeId);
  }

  function handleClubChange(value: string) {
    const clubId = Number(value);
    selectClubAndLoad(clubId, null);
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
          {/* Local field filter */}
          <Select
            value={
              selectedLocalFieldId === "all"
                ? "all"
                : String(selectedLocalFieldId)
            }
            onValueChange={handleLocalFieldChange}
            disabled={isLocalFieldLocked}
          >
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder={t("view.select_local_field_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {!isLocalFieldLocked && (
                <SelectItem value="all">{t("view.local_field_all")}</SelectItem>
              )}
              {localFields.map((lf) => (
                <SelectItem
                  key={lf.local_field_id}
                  value={String(lf.local_field_id)}
                >
                  {lf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Club type filter */}
          <Select
            value={
              selectedClubTypeId === "all" ? "all" : String(selectedClubTypeId)
            }
            onValueChange={handleClubTypeChange}
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder={t("view.select_club_type_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("view.club_type_all")}</SelectItem>
              {clubTypes.map((clubType) => (
                <SelectItem
                  key={clubType.club_type_id}
                  value={String(clubType.club_type_id)}
                >
                  {clubType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Club selector */}
          <Select
            value={selectedClubId ? String(selectedClubId) : ""}
            onValueChange={handleClubChange}
            disabled={filteredClubs.length === 0}
          >
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder={t("view.select_club_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {filteredClubs.map((club) => (
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
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder={t("view.all_categories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("view.all_categories")}</SelectItem>
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
            title={t("view.refresh_title")}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">{t("view.refresh_sr")}</span>
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
            {t("view.new_item")}
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
          {t("view.items_found_label", { count: items.length })}
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          {t("view.loading")}
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
