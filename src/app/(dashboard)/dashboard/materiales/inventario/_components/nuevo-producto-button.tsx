"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductFormSheet } from "./product-form-sheet";
import type { MaterialCategory } from "@/lib/types/materiales";

interface NuevoProductoButtonProps {
  categories: MaterialCategory[];
}

export function NuevoProductoButton({ categories }: NuevoProductoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 size-4" />
        Nuevo producto
      </Button>

      <ProductFormSheet
        open={open}
        onOpenChange={setOpen}
        mode="create"
        categories={categories}
      />
    </>
  );
}
