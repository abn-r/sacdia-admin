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
import type {
  CamporeeOrderOwnerScope,
  CamporeeOrderSizeScheme,
} from "@/lib/types/camporee-orders";
import {
  ownerScopeLabel,
  toCatalogTerritoryActor,
} from "@/components/camporee-orders/catalog-territory";
import { getCamporeeOrderUiErrorMessage } from "@/components/camporee-orders/camporee-order-errors";

const SIZE_SCHEMES: CamporeeOrderSizeScheme[] = ["LETTER", "NUMERIC", "NONE"];

function defaultOwnerScope(
  actor: ReturnType<typeof toCatalogTerritoryActor>,
): CamporeeOrderOwnerScope {
  if (actor.level === "local_field") return "LOCAL_FIELD";
  if (actor.level === "union") return "UNION";
  return "DIVISION";
}

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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSizeScheme("LETTER");
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
    setSaving(true);
    try {
      if (editProduct) {
        await updateCamporeeOrderProduct(editProduct.camporee_order_product_id, {
          title: title.trim(),
          description: description.trim() || null,
          size_scheme: sizeScheme,
        });
        toast.success(t("catalog.updated"));
      } else {
        const ownerScope = defaultOwnerScope(actor);
        await createCamporeeOrderProduct({
          title: title.trim(),
          description: description.trim() || undefined,
          size_scheme: sizeScheme,
          owner_scope: ownerScope,
          ...(ownerScope === "DIVISION" && actor.divisionId
            ? { owner_division_id: actor.divisionId }
            : {}),
          ...(ownerScope === "UNION" && actor.unionId
            ? { owner_union_id: actor.unionId }
            : {}),
          ...(ownerScope === "LOCAL_FIELD" && actor.localFieldId
            ? { owner_local_field_id: actor.localFieldId }
            : {}),
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
        <DialogContent>
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
              <Label>{t("catalog.fieldSizeScheme")}</Label>
              <Select
                value={sizeScheme}
                onValueChange={(value) =>
                  setSizeScheme(value as CamporeeOrderSizeScheme)
                }
              >
                <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("detail.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!title.trim() || saving}
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
