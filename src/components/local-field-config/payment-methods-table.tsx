"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toneBadgeProps } from "@/components/materials/badge-tones";
import { PaymentMethodDialog } from "@/components/local-field-config/payment-method-dialog";
import { clearPaymentMethod } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import {
  maskClabe,
  type PaymentMethodRow,
} from "@/lib/local-field-config/payment-method-rows";

interface PaymentMethodsTableProps {
  rows: PaymentMethodRow[];
}

type DialogState =
  | { kind: "closed" }
  | {
      kind: "open";
      mode: "create" | "edit";
      row: PaymentMethodRow;
    };

export function PaymentMethodsTable({ rows }: PaymentMethodsTableProps) {
  const t = useTranslations("localFieldConfig.pages.paymentMethods");
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodRow | null>(
    null,
  );
  const [isDeleting, startDeleteTransition] = useTransition();

  function openDialog(row: PaymentMethodRow, mode: "create" | "edit") {
    setDialog({ kind: "open", mode, row });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      try {
        await clearPaymentMethod(deleteTarget.localFieldId);
        toast.success(t("deleteSuccess"));
        setDeleteTarget(null);
        router.refresh();
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : t("deleteError");
        toast.error(message);
      }
    });
  }

  function formatUpdatedAt(iso: string | null | undefined): string {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colLocalField")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colMethod")}</TableHead>
              <TableHead>{t("colBank")}</TableHead>
              <TableHead>{t("colHolder")}</TableHead>
              <TableHead>{t("colClabe")}</TableHead>
              <TableHead>{t("colUpdated")}</TableHead>
              <TableHead className="sticky right-0 w-[1%] bg-background text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                {t("colActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const statusProps = row.configured
                ? toneBadgeProps("success")
                : toneBadgeProps("warning");

              return (
                <TableRow key={row.localFieldId}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.abbreviation ? (
                      <div className="text-xs text-muted-foreground">
                        {row.abbreviation}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge {...statusProps}>
                      {row.configured ? t("statusConfigured") : t("statusMissing")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.configured ? t("methodTransfer") : "—"}
                  </TableCell>
                  <TableCell>{row.config?.bank_name?.trim() || "—"}</TableCell>
                  <TableCell>
                    {row.config?.account_holder?.trim() || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.configured
                      ? maskClabe(row.config?.bank_account_clabe)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatUpdatedAt(row.config?.updated_at)}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-background text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                    {row.canManage ? (
                      <div className="flex justify-end gap-1">
                        {row.configured ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(row, "edit")}
                            >
                              <Pencil data-icon="inline-start" />
                              {t("actionEdit")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 data-icon="inline-start" />
                              {t("actionDelete")}
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => openDialog(row, "create")}
                          >
                            <Plus data-icon="inline-start" />
                            {t("actionCreate")}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("actionReadonly")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {dialog.kind === "open" && (
        <PaymentMethodDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialog({ kind: "closed" });
          }}
          localFieldId={dialog.row.localFieldId}
          localFieldName={dialog.row.name}
          config={dialog.row.config}
          mode={dialog.mode}
        />
      )}

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("actionDelete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
