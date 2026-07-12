"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryFormSheet } from "./category-form-sheet";

export function NewCategoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 size-4" />
        Nueva categoría
      </Button>
      <CategoryFormSheet open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
