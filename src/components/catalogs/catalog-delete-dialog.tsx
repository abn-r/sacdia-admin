"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Trash2, Loader2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteCatalogItemAction, type CatalogActionState } from "@/lib/catalogs/actions";
import type { EntityKey } from "@/lib/catalogs/entities";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4 mr-1.5" />
      )}
      {pending ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}

interface CatalogDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityKey: EntityKey;
  itemId: number | string;
  itemName: string;
  returnPath: string;
}

export function CatalogDeleteDialog({
  open,
  onOpenChange,
  entityKey,
  itemId,
  itemName,
  returnPath,
}: CatalogDeleteDialogProps) {
  const [state, action] = useActionState<CatalogActionState, FormData>(deleteCatalogItemAction, {});

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <div className="rounded-full bg-destructive/10 p-2.5 mx-auto mb-3 w-fit">
            <AlertTriangle className="size-10 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            Eliminar {itemName}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            ¿Estás seguro que querés eliminar{" "}
            <span className="font-semibold text-foreground">&quot;{itemName}&quot;</span>?{" "}
            Este registro será desactivado y podrá ser restaurado posteriormente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action}>
          <input type="hidden" name="entityKey" value={entityKey} />
          <input type="hidden" name="id" value={itemId} />
          <input type="hidden" name="returnPath" value={returnPath} />
          {state.error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 flex items-start gap-2 mb-3">
              <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <DeleteButton />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
