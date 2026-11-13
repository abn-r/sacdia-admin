"use client";

/**
 * Size options of a camporee order product (LETTER / NUMERIC schemes).
 *
 * The backend does not auto-create options (`catalog.service.ts addOption`), so
 * a sized product cannot be ordered until it has at least one active option.
 * There is no DELETE: "deactivate" is `PATCH { active: false }`. The label of an
 * option that already has order lines is immutable (422
 * `CAMPOREE_ORDER_OPTION_FORBIDDEN`), only order and active can change.
 */

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import {
  addCamporeeOrderProductOption,
  updateCamporeeOrderProductOption,
  type CamporeeOrderProduct,
  type CamporeeOrderProductOption,
} from "@/lib/api/camporee-orders";
import { getCamporeeOrderUiErrorMessage } from "@/components/camporee-orders/camporee-order-errors";

export const LETTER_SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL"] as const;
const NUMERIC_LABEL = /^\d+$/;
const MAX_LABEL = 40;

export interface CamporeeOrderProductOptionsDialogProps {
  product: CamporeeOrderProduct | null;
  onOpenChange: (open: boolean) => void;
  /** Exact catalog owner with `camporee-orders:catalog-manage`. */
  canEdit: boolean;
  /** Called after any successful write so the parent refreshes the product. */
  onChanged: () => Promise<void> | void;
}

function sortOptions(options: CamporeeOrderProductOption[]) {
  return [...options].sort(
    (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label),
  );
}

export function CamporeeOrderProductOptionsDialog({
  product,
  onOpenChange,
  canEdit,
  onChanged,
}: CamporeeOrderProductOptionsDialogProps) {
  const t = useTranslations("camporee_orders");
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editOrder, setEditOrder] = useState("");
  const [deactivateTarget, setDeactivateTarget] =
    useState<CamporeeOrderProductOption | null>(null);

  const options = useMemo(() => sortOptions(product?.options ?? []), [product]);
  const scheme = product?.size_scheme ?? "NONE";
  const nextOrder = options.length
    ? Math.max(...options.map((option) => option.sort_order)) + 1
    : 0;

  function validateLabel(raw: string, ignoreId?: string): string | null {
    const label = raw.trim();
    if (!label || label.length > MAX_LABEL) return t("catalog.options.invalidLength");
    if (scheme === "NUMERIC" && !NUMERIC_LABEL.test(label)) {
      return t("catalog.options.invalidNumeric");
    }
    const lower = label.toLowerCase();
    const duplicated = options.some(
      (option) =>
        option.camporee_order_product_option_id !== ignoreId &&
        option.label.toLowerCase() === lower,
    );
    return duplicated ? t("catalog.options.duplicateLocal") : null;
  }

  function parseOrder(raw: string, fallback: number): number | null {
    if (!raw.trim()) return fallback;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setFormError(null);
    try {
      await action();
      toast.success(success);
      await onChanged();
      return true;
    } catch (error) {
      const message = getCamporeeOrderUiErrorMessage(error, t);
      setFormError(message);
      toast.error(message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!product) return;
    const error = validateLabel(newLabel);
    if (error) {
      setFormError(error);
      return;
    }
    const order = parseOrder(newOrder, nextOrder);
    if (order == null) {
      setFormError(t("catalog.options.invalidLength"));
      return;
    }
    const ok = await run(async () => {
      await addCamporeeOrderProductOption(product.camporee_order_product_id, {
        label: newLabel.trim(),
        sort_order: order,
      });
    }, t("catalog.options.toasts.added"));
    if (ok) {
      setNewLabel("");
      setNewOrder("");
    }
  }

  async function handleAddPresets() {
    if (!product) return;
    const existing = new Set(options.map((option) => option.label.toLowerCase()));
    const missing = LETTER_SIZE_PRESETS.filter((label) => !existing.has(label.toLowerCase()));
    if (missing.length === 0) return;
    // When every size is a preset, keep the natural order (XS…XXL), moving the
    // existing ones too. A product with its own sizes keeps its order.
    const presetIndex = (label: string) =>
      LETTER_SIZE_PRESETS.findIndex((preset) => preset.toLowerCase() === label.toLowerCase());
    const onlyPresets = options.every((option) => presetIndex(option.label) >= 0);
    setBusy(true);
    setFormError(null);
    let added = 0;
    try {
      for (const [index, label] of missing.entries()) {
        await addCamporeeOrderProductOption(product.camporee_order_product_id, {
          label,
          sort_order: onlyPresets ? presetIndex(label) + 1 : nextOrder + index,
        });
        added += 1;
      }
      if (onlyPresets) {
        for (const option of options) {
          const natural = presetIndex(option.label) + 1;
          if (option.sort_order !== natural) {
            await updateCamporeeOrderProductOption(option.camporee_order_product_option_id, {
              sort_order: natural,
            });
          }
        }
      }
    } catch (error) {
      const message = getCamporeeOrderUiErrorMessage(error, t);
      setFormError(message);
      toast.error(message);
    } finally {
      if (added > 0) {
        toast.success(t("catalog.options.toasts.presetsAdded", { count: added }));
        await onChanged();
      }
      setBusy(false);
    }
  }

  function startEdit(option: CamporeeOrderProductOption) {
    setEditingId(option.camporee_order_product_option_id);
    setEditLabel(option.label);
    setEditOrder(String(option.sort_order));
    setFormError(null);
  }

  async function handleSaveEdit(option: CamporeeOrderProductOption) {
    const labelChanged = editLabel.trim() !== option.label;
    if (labelChanged) {
      const error = validateLabel(editLabel, option.camporee_order_product_option_id);
      if (error) {
        setFormError(error);
        return;
      }
    }
    const order = parseOrder(editOrder, option.sort_order);
    if (order == null) {
      setFormError(t("catalog.options.invalidLength"));
      return;
    }
    const ok = await run(async () => {
      await updateCamporeeOrderProductOption(option.camporee_order_product_option_id, {
        ...(labelChanged ? { label: editLabel.trim() } : {}),
        ...(order !== option.sort_order ? { sort_order: order } : {}),
      });
    }, t("catalog.options.toasts.updated"));
    if (ok) setEditingId(null);
  }

  async function setActive(option: CamporeeOrderProductOption, active: boolean) {
    await run(
      async () => {
        await updateCamporeeOrderProductOption(option.camporee_order_product_option_id, {
          active,
        });
      },
      t(active ? "catalog.options.toasts.activated" : "catalog.options.toasts.deactivated"),
    );
    setDeactivateTarget(null);
  }

  const open = product != null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          if (!next) {
            setEditingId(null);
            setFormError(null);
            setNewLabel("");
            setNewOrder("");
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {t("catalog.options.dialogTitle", { title: product?.title ?? "" })}
            </DialogTitle>
            <DialogDescription>
              {scheme === "NUMERIC"
                ? t("catalog.options.dialogDescriptionNumeric")
                : scheme === "LETTER"
                  ? t("catalog.options.dialogDescriptionLetter")
                  : t("catalog.options.noneHint")}
            </DialogDescription>
          </DialogHeader>

          {!canEdit && (
            <Badge variant="secondary" className="w-fit">
              {t("catalog.options.readOnly")}
            </Badge>
          )}

          {options.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {t("catalog.options.empty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("catalog.options.colLabel")}</th>
                    <th className="px-3 py-2 font-medium">{t("catalog.options.colOrder")}</th>
                    <th className="px-3 py-2 font-medium">{t("catalog.options.colStatus")}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {options.map((option) => {
                    const id = option.camporee_order_product_option_id;
                    const editing = editingId === id;
                    return (
                      <tr key={id} className="border-t">
                        <td className="px-3 py-2">
                          {editing ? (
                            <Input
                              aria-label={t("catalog.options.colLabel")}
                              value={editLabel}
                              maxLength={MAX_LABEL}
                              onChange={(event) => setEditLabel(event.target.value)}
                              disabled={busy}
                              className="h-8 w-28"
                            />
                          ) : (
                            <span className="font-medium">{option.label}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {editing ? (
                            <Input
                              aria-label={t("catalog.options.colOrder")}
                              type="number"
                              min={0}
                              value={editOrder}
                              onChange={(event) => setEditOrder(event.target.value)}
                              disabled={busy}
                              className="h-8 w-20"
                            />
                          ) : (
                            option.sort_order
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            intent={flagStatusIntent(option.active)}
                            label={t(
                              option.active
                                ? "catalog.options.active"
                                : "catalog.options.inactive",
                            )}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {canEdit ? (
                            <div className="flex justify-end gap-2">
                              {editing ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    loading={busy}
                                    onClick={() => void handleSaveEdit(option)}
                                  >
                                    {t("catalog.options.save")}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() => setEditingId(null)}
                                  >
                                    {t("catalog.options.cancel")}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={busy}
                                    aria-label={`${t("catalog.options.edit")} ${option.label}`}
                                    onClick={() => startEdit(option)}
                                  >
                                    {t("catalog.options.edit")}
                                  </Button>
                                  {option.active ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={busy}
                                      aria-label={`${t("catalog.options.deactivate")} ${option.label}`}
                                      onClick={() => setDeactivateTarget(option)}
                                    >
                                      {t("catalog.options.deactivate")}
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={busy}
                                      aria-label={`${t("catalog.options.activate")} ${option.label}`}
                                      onClick={() => void setActive(option, true)}
                                    >
                                      {t("catalog.options.activate")}
                                    </Button>
                                  )}
                                </>
                              )}
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

          {canEdit && scheme !== "NONE" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="option-new-label">{t("catalog.options.addLabel")}</Label>
                  <Input
                    id="option-new-label"
                    value={newLabel}
                    maxLength={MAX_LABEL}
                    inputMode={scheme === "NUMERIC" ? "numeric" : "text"}
                    placeholder={
                      scheme === "NUMERIC"
                        ? t("catalog.options.addPlaceholderNumeric")
                        : t("catalog.options.addPlaceholderLetter")
                    }
                    onChange={(event) => {
                      setNewLabel(event.target.value);
                      setFormError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleAdd();
                      }
                    }}
                    disabled={busy}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="option-new-order">{t("catalog.options.orderLabel")}</Label>
                  <Input
                    id="option-new-order"
                    type="number"
                    min={0}
                    value={newOrder}
                    placeholder={String(nextOrder)}
                    onChange={(event) => setNewOrder(event.target.value)}
                    disabled={busy}
                    className="w-24"
                  />
                </div>
                <Button
                  type="button"
                  loading={busy}
                  disabled={!newLabel.trim()}
                  onClick={() => void handleAdd()}
                >
                  <Plus className="size-4" aria-hidden />
                  {t("catalog.options.add")}
                </Button>
              </div>

              {scheme === "LETTER" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleAddPresets()}
                  >
                    {t("catalog.options.addPresets")}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t("catalog.options.presetsHint")}
                  </span>
                </div>
              )}
            </div>
          )}

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {t("catalog.options.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deactivateTarget != null}
        onOpenChange={(next) => {
          if (!next && !busy) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("catalog.options.deactivateTitle", { label: deactivateTarget?.label ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("catalog.options.deactivateDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("catalog.options.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              loading={busy}
              variant="destructive-solid"
              onClick={(event) => {
                event.preventDefault();
                if (deactivateTarget) void setActive(deactivateTarget, false);
              }}
            >
              {t("catalog.options.deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
