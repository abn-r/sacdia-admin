"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CamporeeFormDialog } from "@/components/camporees/camporee-form-dialog";
import { DeleteCamporeeDialog } from "@/components/camporees/delete-camporee-dialog";
import type { Camporee } from "@/lib/api/camporees";

interface CamporeeDetailActionsProps {
  camporee: Camporee;
}

export function CamporeeDetailActions({ camporee }: CamporeeDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleEditSuccess() {
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="mr-2 size-3.5" />
        Editar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="mr-2 size-3.5" />
        Eliminar
      </Button>

      <CamporeeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        camporee={camporee}
        onSuccess={handleEditSuccess}
      />

      <DeleteCamporeeDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        camporee={camporee}
        redirectTo="/dashboard/camporees"
      />
    </>
  );
}
