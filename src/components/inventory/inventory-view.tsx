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
import {
  clubTypeIdToInstanceType,
  filterInventorySections,
  type InventorySectionOption,
} from "@/lib/inventory/club-sections";

type AnyRecord = Record<string, unknown>;

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

interface InventoryViewProps {
  sections: InventorySectionOption[];
  categories: InventoryCategory[];
  localFields: LocalField[];
  clubTypes: ClubType[];
  territoryScope: AdminTerritoryScope;
  initialItems: InventoryItem[];
  initialSectionId: number | null;
  initialLocalFieldId: number | "all";
  initialClubTypeId: number | "all";
}

export function InventoryView({
  sections,
  categories,
  localFields,
  clubTypes,
  territoryScope,
  initialItems,
  initialSectionId,
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
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    initialSectionId,
  );
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const filteredSections = filterInventorySections(
    sections,
    selectedLocalFieldId,
    selectedClubTypeId,
  );

  const selectedSection =
    filteredSections.find((section) => section.club_section_id === selectedSectionId) ??
    sections.find((section) => section.club_section_id === selectedSectionId) ??
    null;

  const instanceType: InstanceType = selectedSection
    ? clubTypeIdToInstanceType(selectedSection.club_type_id)
    : "pathf";

  const loadItems = useCallback(
    async (clubSectionId: number, categoryId?: number | null) => {
      const section = sections.find(
        (entry) => entry.club_section_id === clubSectionId,
      );
      const instType = section
        ? clubTypeIdToInstanceType(section.club_type_id)
        : "pathf";

      setIsLoading(true);
      setLoadError(null);
      try {
        const params: Record<string, string | number> = {
          instanceType: instType,
        };
        if (categoryId) params.category = categoryId;

        const payload = await apiRequestFromClient<unknown>(
          `/inventory/clubs/${clubSectionId}/inventory`,
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
    [sections, t],
  );

  function selectSectionAndLoad(
    clubSectionId: number,
    categoryId: number | null = null,
  ) {
    setSelectedSectionId(clubSectionId);
    setFilterCategoryId(categoryId);
    loadItems(clubSectionId, categoryId);
  }

  function applySectionFilters(
    localFieldId: number | "all",
    clubTypeId: number | "all",
  ) {
    const nextSections = filterInventorySections(
      sections,
      localFieldId,
      clubTypeId,
    );

    if (nextSections.length === 0) {
      setSelectedSectionId(null);
      setItems([]);
      setLoadError(null);
      return;
    }

    const currentSectionStillValid = nextSections.some(
      (section) => section.club_section_id === selectedSectionId,
    );
    const nextSectionId = currentSectionStillValid
      ? (selectedSectionId as number)
      : nextSections[0].club_section_id;
    selectSectionAndLoad(nextSectionId, null);
  }

  function handleLocalFieldChange(value: string) {
    const nextLocalFieldId = value === "all" ? "all" : Number(value);
    setSelectedLocalFieldId(nextLocalFieldId);
    applySectionFilters(nextLocalFieldId, selectedClubTypeId);
  }

  function handleClubTypeChange(value: string) {
    const nextClubTypeId = value === "all" ? "all" : Number(value);
    setSelectedClubTypeId(nextClubTypeId);
    applySectionFilters(selectedLocalFieldId, nextClubTypeId);
  }

  function handleSectionChange(value: string) {
    const clubSectionId = Number(value);
    selectSectionAndLoad(clubSectionId, null);
  }

  function handleCategoryFilter(value: string) {
    const categoryId = value === "all" ? null : Number(value);
    setFilterCategoryId(categoryId);
    if (selectedSectionId) {
      loadItems(selectedSectionId, categoryId);
    }
  }

  function handleRefresh() {
    if (selectedSectionId) {
      loadItems(selectedSectionId, filterCategoryId);
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
    if (selectedSectionId) {
      loadItems(selectedSectionId, filterCategoryId);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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

          <Select
            value={selectedSectionId ? String(selectedSectionId) : ""}
            onValueChange={handleSectionChange}
            disabled={filteredSections.length === 0}
          >
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder={t("view.select_club_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {filteredSections.map((section) => (
                <SelectItem
                  key={section.club_section_id}
                  value={String(section.club_section_id)}
                >
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterCategoryId ? String(filterCategoryId) : "all"}
            onValueChange={handleCategoryFilter}
            disabled={!selectedSectionId}
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
            disabled={!selectedSectionId || isLoading}
            title={t("view.refresh_title")}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">{t("view.refresh_sr")}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedSection && (
            <span className="text-xs text-muted-foreground">
              {INSTANCE_TYPE_LABELS[instanceType]}
            </span>
          )}
          <Button onClick={handleCreate} disabled={!selectedSectionId} size="sm">
            <Plus className="size-4" />
            {t("view.new_item")}
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {selectedSectionId && !loadError && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{items.length}</span>{" "}
          {t("view.items_found_label", { count: items.length })}
        </p>
      )}

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

      <InventoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clubId={selectedSectionId ?? 0}
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
