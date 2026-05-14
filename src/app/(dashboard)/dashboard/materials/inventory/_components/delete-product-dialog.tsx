"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
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
import { deleteProduct } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import type { MaterialProduct } from "@/lib/types/materials";

interface DeleteProductDialogProps {
  product: MaterialProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
}: DeleteProductDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleConfirm() {
    if (!product) return;
    try {
      await deleteProduct(product.id);
      toast.success(`Producto "${product.title}" desactivado.`);
      onOpenChange(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "No se puede eliminar: el producto tiene órdenes abiertas.",
        );
      } else {
        const message =
          err instanceof ApiError
            ? err.message
            : "Error al eliminar el producto.";
        toast.error(message);
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar producto?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                El producto{" "}
                <span className="font-medium text-foreground">
                  {product?.title}
                </span>{" "}
                (SKU: <span className="font-mono text-xs">{product?.sku}</span>)
                será marcado como inactivo y no aparecerá en el catálogo.
              </p>
              <p className="text-destructive/90 text-sm">
                Si el producto tiene órdenes abiertas, no podrá desactivarse.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Desactivar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
