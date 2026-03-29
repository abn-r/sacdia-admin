"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { CatalogFormDialog } from "@/components/catalogs/catalog-form-dialog";
import { CatalogDeleteDialog } from "@/components/catalogs/catalog-delete-dialog";
import type { EntityConfig, EntityKey } from "@/lib/catalogs/entities";
import type { CatalogItem } from "@/lib/catalogs/service";
import type { CatalogActionState } from "@/lib/catalogs/actions";

type SelectOption = { label: string; value: number };

type BoundAction = (prevState: CatalogActionState, formData: FormData) => Promise<CatalogActionState>;
type UpdateActionBase = (
  entityKey: EntityKey,
  id: number | string,
  redirectTo: string,
  _: CatalogActionState,
  formData: FormData,
) => Promise<CatalogActionState>;

interface CatalogCrudPageProps {
  config: EntityConfig;
  items: CatalogItem[];
  selectOptions: Record<string, SelectOption[]>;
  displaySelectOptions?: Record<string, SelectOption[]>;
  createAction: BoundAction;
  updateActionBase: UpdateActionBase;
  entityKey: EntityKey;
  routeBase: string;
}

export function CatalogCrudPage({
  config,
  items,
  selectOptions,
  displaySelectOptions = {},
  createAction,
  updateActionBase,
  entityKey,
  routeBase,
}: CatalogCrudPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);

  const canMutate = config.allowMutations !== false;

  const displayFields = config.fields.filter((f) => f.type !== "checkbox");
  const getItemId = (item: CatalogItem): string | null => {
    const rawId = item[config.idField];
    if (rawId === null || rawId === undefined) return null;
    const normalized = String(rawId).trim();
    return normalized.length > 0 ? normalized : null;
  };

  const editItemId = editItem ? getItemId(editItem) : null;
  const deleteItemId = deleteItem ? getItemId(deleteItem) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
            <Badge variant="secondary" className="text-xs">
              {items.length} {items.length === 1 ? "registro" : "registros"}
            </Badge>
            {!canMutate && <Badge variant="outline">Solo lectura</Badge>}
          </div>
          {config.description && (
            <p className="text-sm text-muted-foreground">{config.description}</p>
          )}
        </div>
        {canMutate && (
          <Button size="default" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Crear {config.singularTitle.toLowerCase()}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={`No hay ${config.title.toLowerCase()}`}
          description="No se encontraron registros."
        >
          {canMutate && (
            <Button size="default" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Crear {config.singularTitle.toLowerCase()}
            </Button>
          )}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-xs uppercase tracking-wider text-muted-foreground font-medium">ID</TableHead>
                {displayFields.map((f) => (
                  <TableHead key={f.name} className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{f.label}</TableHead>
                ))}
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Estado</TableHead>
                {canMutate && <TableHead className="w-[100px] text-xs uppercase tracking-wider text-muted-foreground font-medium">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => {
                const itemId = getItemId(item);
                const rowKey = itemId ? `${config.key}-${itemId}` : `${config.key}-row-${idx}`;

                return (
                  <TableRow key={rowKey} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs text-muted-foreground">{itemId ?? "—"}</TableCell>
                    {displayFields.map((f) => {
                      const val = item[f.name];
                      let display: string;

                      if (f.type === "select" && f.optionsEntityKey) {
                        const opts =
                          displaySelectOptions[f.optionsEntityKey] ??
                          selectOptions[f.optionsEntityKey] ??
                          [];
                        const match = opts.find((o) => o.value === Number(val));
                        display = match?.label ?? String(val ?? "—");
                      } else {
                        display = val != null ? String(val) : "—";
                      }

                      return (
                        <TableCell key={f.name} className="text-sm">
                          {display}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Badge
                        variant={item.active !== false ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {item.active !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    {canMutate && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 hover:bg-muted"
                            disabled={!itemId}
                            onClick={() => setEditItem(item)}
                            title="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive hover:bg-muted"
                            disabled={!itemId}
                            onClick={() => setDeleteItem(item)}
                            title="Eliminar"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {canMutate && (
        <CatalogFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={`Crear ${config.singularTitle.toLowerCase()}`}
          fields={config.fields}
          selectOptions={selectOptions}
          formAction={createAction}
        />
      )}

      {canMutate && editItem && editItemId && (
        <CatalogFormDialog
          open={!!editItem}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
          title={`Editar ${config.singularTitle.toLowerCase()}`}
          fields={config.fields}
          initialValues={editItem}
          selectOptions={selectOptions}
          formAction={updateActionBase.bind(null, entityKey, editItemId, routeBase)}
        />
      )}

      {canMutate && deleteItem && deleteItemId && (
        <CatalogDeleteDialog
          open={!!deleteItem}
          onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
          entityKey={config.key}
          itemId={deleteItemId}
          itemName={String(deleteItem[config.nameField] ?? "registro")}
          returnPath={config.routeBase}
        />
      )}
    </div>
  );
}
