"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookOpen, Loader2, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_ORDERS_CATALOG_MANAGE,
} from "@/lib/auth/permissions";
import { resolveAdminTerritoryScope } from "@/lib/auth/territory-scope";
import {
  createCamporeeOrderProduct,
  isExactCatalogOwner,
  listCamporeeOrderProducts,
  updateCamporeeOrderProduct,
  type CamporeeOrderProduct,
} from "@/lib/api/camporee-orders";
import {
  listDivisions,
  listLocalFields,
  listUnions,
  type Division,
  type LocalField,
  type Union,
} from "@/lib/api/geography";
import type {
  CamporeeOrderOwnerScope,
  CamporeeOrderSizeScheme,
} from "@/lib/types/camporee-orders";
import {
  buildCatalogCreateOwnerFields,
  defaultCatalogOwnerScope,
  ownerScopeLabel,
  toCatalogTerritoryActor,
} from "@/components/camporee-orders/catalog-territory";
import { getCamporeeOrderUiErrorMessage } from "@/components/camporee-orders/camporee-order-errors";

const SIZE_SCHEMES: CamporeeOrderSizeScheme[] = ["LETTER", "NUMERIC", "NONE"];
const OWNER_SCOPES: CamporeeOrderOwnerScope[] = [
  "DIVISION",
  "UNION",
  "LOCAL_FIELD",
];

export function CamporeeOrderCatalogClient() {
  const t = useTranslations("camporee_orders");
  const { user } = useAuth();
  const canManage = hasPermission(user, CAMPOREE_ORDERS_CATALOG_MANAGE);
  const actor = useMemo(
    () => toCatalogTerritoryActor(resolveAdminTerritoryScope(user)),
    [user],
  );

  const [products, setProducts] = useState<CamporeeOrderProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<CamporeeOrderProduct | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sizeScheme, setSizeScheme] = useState<CamporeeOrderSizeScheme>("LETTER");
  const [ownerScope, setOwnerScope] =
    useState<CamporeeOrderOwnerScope>("DIVISION");
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [localFields, setLocalFields] = useState<LocalField[]>([]);

  const needsOwnerPicker = actor.level === "all" && !editProduct;
  const createOwnerFields = buildCatalogCreateOwnerFields(
    actor,
    needsOwnerPicker && ownerId != null
      ? { scope: ownerScope, ownerId }
      : undefined,
  );
  const territoryOptions =
    ownerScope === "DIVISION"
      ? divisions.map((row) => ({ id: row.division_id, name: row.name }))
      : ownerScope === "UNION"
        ? unions.map((row) => ({ id: row.union_id, name: row.name }))
        : localFields.map((row) => ({
            id: row.local_field_id,
            name: row.name,
          }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listCamporeeOrderProducts());
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t, "toasts.loadFailed"));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!createOpen || editProduct || actor.level !== "all") {
      return;
    }
    let cancelled = false;
    void Promise.all([listDivisions(), listUnions(), listLocalFields()])
      .then(([nextDivisions, nextUnions, nextFields]) => {
        if (cancelled) return;
        setDivisions(nextDivisions.filter((row) => row.active !== false));
        setUnions(nextUnions.filter((row) => row.active !== false));
        setLocalFields(nextFields.filter((row) => row.active !== false));
      })
      .catch((error) => {
        toast.error(
          getCamporeeOrderUiErrorMessage(error, t, "toasts.loadFailed"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [createOpen, editProduct, actor.level, t]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSizeScheme("LETTER");
    setOwnerScope(defaultCatalogOwnerScope(actor));
    setOwnerId(null);
  };

  const openCreate = () => {
    resetForm();
    setEditProduct(null);
    setCreateOpen(true);
  };

  const openEdit = (product: CamporeeOrderProduct) => {
    setTitle(product.title);
    setDescription(product.description ?? "");
    setSizeScheme(product.size_scheme);
    setEditProduct(product);
    setCreateOpen(true);
  };

  const saveProduct = async () => {
    if (!title.trim()) return;
    if (!editProduct && !createOwnerFields) return;
    setSaving(true);
    try {
      if (editProduct) {
        await updateCamporeeOrderProduct(editProduct.camporee_order_product_id, {
          title: title.trim(),
          description: description.trim() || null,
          size_scheme: sizeScheme,
        });
        toast.success(t("catalog.updated"));
      } else if (createOwnerFields) {
        const trimmedDescription = description.trim();
        await createCamporeeOrderProduct({
          title: title.trim(),
          size_scheme: sizeScheme,
          ...createOwnerFields,
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
        });
        toast.success(t("catalog.created"));
      }
      setCreateOpen(false);
      resetForm();
      setEditProduct(null);
      await load();
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (product: CamporeeOrderProduct) => {
    setSaving(true);
    try {
      await updateCamporeeOrderProduct(product.camporee_order_product_id, {
        active: false,
      });
      toast.success(t("catalog.deactivated"));
      await load();
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canManage && actor.level !== "unconfigured" && actor.level !== "open" ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            {t("catalog.createProduct")}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("tray.refresh")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("tray.loading")}</p>
      ) : products.length === 0 ? (
        <EmptyState icon={BookOpen} title={t("catalog.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("catalog.colTitle")}</th>
                <th className="px-3 py-2 font-medium">{t("catalog.colOwner")}</th>
                <th className="px-3 py-2 font-medium">{t("catalog.colSizes")}</th>
                <th className="px-3 py-2 font-medium">{t("catalog.colOptions")}</th>
                <th className="px-3 py-2 font-medium">{t("catalog.colStatus")}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const editable = isExactCatalogOwner(product, actor);
                return (
                  <tr key={product.camporee_order_product_id} className="border-t">
                    <td className="px-3 py-2">
                      <p className="font-medium">{product.title}</p>
                      {product.description ? (
                        <p className="text-muted-foreground text-xs">
                          {product.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {ownerScopeLabel(product.owner_scope, t)}
                    </td>
                    <td className="px-3 py-2">{product.size_scheme}</td>
                    <td className="px-3 py-2">
                      {product.options.filter((o) => o.active).length}
                    </td>
                    <td className="px-3 py-2">
                      {!editable && (
                        <Badge variant="secondary">{t("catalog.readOnly")}</Badge>
                      )}
                      {!product.active && (
                        <Badge variant="outline">{t("catalog.inactive")}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editable && canManage && product.active ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openEdit(product)}
                          >
                            {t("catalog.edit")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => void deactivate(product)}
                          >
                            {t("catalog.deactivate")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editProduct ? t("catalog.editTitle") : t("catalog.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="product-title">{t("catalog.fieldTitle")}</Label>
              <Input
                id="product-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="product-description">{t("catalog.fieldDescription")}</Label>
              <Textarea
                id="product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="product-size-scheme">{t("catalog.fieldSizeScheme")}</Label>
              <Select
                value={sizeScheme}
                onValueChange={(value) =>
                  setSizeScheme(value as CamporeeOrderSizeScheme)
                }
              >
                <SelectTrigger
                  id="product-size-scheme"
                  aria-label={t("catalog.fieldSizeScheme")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_SCHEMES.map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {t(`catalog.sizeScheme.${scheme}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsOwnerPicker ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="product-owner-scope">
                    {t("catalog.fieldOwnerScope")}
                  </Label>
                  <Select
                    value={ownerScope}
                    onValueChange={(value) => {
                      setOwnerScope(value as CamporeeOrderOwnerScope);
                      setOwnerId(null);
                    }}
                  >
                    <SelectTrigger
                      id="product-owner-scope"
                      aria-label={t("catalog.fieldOwnerScope")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OWNER_SCOPES.map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          {ownerScopeLabel(scope, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="product-owner-territory">
                    {t("catalog.fieldOwnerTerritory")}
                  </Label>
                  <Select
                    value={ownerId != null ? String(ownerId) : ""}
                    onValueChange={(value) => setOwnerId(Number(value))}
                  >
                    <SelectTrigger
                      id="product-owner-territory"
                      aria-label={t("catalog.fieldOwnerTerritory")}
                    >
                      <SelectValue
                        placeholder={t("catalog.ownerTerritoryPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {territoryOptions.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    {t("catalog.ownerHint")}
                  </p>
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("detail.cancel")}
            </Button>
            <Button
              type="button"
              disabled={
                !title.trim() || saving || (!editProduct && !createOwnerFields)
              }
              onClick={() => void saveProduct()}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("catalog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
