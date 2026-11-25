"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/shared/row-actions";
import { CamporeeDeleteConfirm } from "@/components/camporees/camporee-delete-confirm";
import {
  ClubRegistrationActions,
  type ClubRegistrationActionsProps,
} from "@/components/camporees/club-registration-actions";
import { camporeeBasePath } from "@/lib/camporees/groups";
import type { CamporeeKind } from "@/lib/camporees/normalize";

export interface CamporeeDetailActionsProps {
  kind: CamporeeKind;
  camporee: { id: number; name: string };
  canEdit: boolean;
  canDelete: boolean;
  registration: ClubRegistrationActionsProps;
}

/** Header actions of the detail: same for local and union camporees. */
export function CamporeeDetailActions({
  kind,
  camporee,
  canEdit,
  canDelete,
  registration,
}: CamporeeDetailActionsProps) {
  const tc = useTranslations("camporees");
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      {canEdit && (
        <Button variant="outline" asChild>
          <Link href={`${camporeeBasePath(kind, camporee.id)}/edit`}>
            <Pencil className="size-4" />
            {tc("unionList.editLabel")}
          </Link>
        </Button>
      )}
      <ClubRegistrationActions {...registration} />
      <RowActions
        label={camporee.name}
        actions={[
          {
            label: `${tc("list.deleteLabel")}…`,
            icon: Trash2,
            destructive: true,
            hidden: !canDelete,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
      <CamporeeDeleteConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        kind={kind}
        camporee={camporee}
        redirectTo={kind === "union" ? "/dashboard/campamentos?tab=union" : "/dashboard/campamentos"}
      />
    </>
  );
}
