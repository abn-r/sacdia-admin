"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductFormSheet } from "./product-form-sheet";
import type {
  MaterialCategory,
  LocalFieldOption,
} from "@/lib/types/materials";

interface NewProductButtonProps {
  categories: MaterialCategory[];
  /**
   * Local fields available to pick from. Only populated for unscoped
   * admin/super-admin callers. LF-scoped users get an empty list and the
   * form skips the LF selector — actorLocalFieldId is forwarded to the
   * server as the implicit scope.
   */
  localFields: LocalFieldOption[];
  /**
   * The caller's bound local_field_id, if any. null = unscoped admin who
   * must pick a target LF in the form.
   */
  actorLocalFieldId: number | null;
}

export function NewProductButton({
  categories,
  localFields,
  actorLocalFieldId,
}: NewProductButtonProps) {
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
        localFields={localFields}
        actorLocalFieldId={actorLocalFieldId}
      />
    </>
  );
}
