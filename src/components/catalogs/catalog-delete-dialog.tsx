"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
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
import { showAppAlert } from "@/lib/ui/app-alerts";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Eliminar
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

  useEffect(() => {
    if (!state.error) return;

    showAppAlert({
      type: "error",
      title: "No se pudo eliminar",
      description: state.error,
    });
  }, [state.error]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará <span className="font-medium">&quot;{itemName}&quot;</span>.
            Esta acción es un soft-delete y puede revertirse desde la base de datos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={action} className="space-y-2">
            <input type="hidden" name="entityKey" value={entityKey} />
            <input type="hidden" name="id" value={itemId} />
            <input type="hidden" name="returnPath" value={returnPath} />
            {state.error && (
              <p className="text-xs text-destructive">{state.error}</p>
            )}
            <DeleteButton />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
