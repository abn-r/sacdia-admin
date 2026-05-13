"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Eye, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteClubAction } from "@/lib/clubs/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClubActionItem {
  id: number;
  name: string;
}

interface ClubsTableActionsCellProps {
  club: ClubActionItem;
  canEdit: boolean;
  canDelete: boolean;
}

// ─── Delete submit button ─────────────────────────────────────────────────────

function DeleteButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("clubs.a11y");
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {t("deleteDialogConfirm")}
    </Button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClubsTableActionsCell({
  club,
  canEdit,
  canDelete,
}: ClubsTableActionsCellProps) {
  const t = useTranslations("clubs.a11y");
  const [deleteItem, setDeleteItem] = useState<ClubActionItem | null>(null);

  const editHref = `/dashboard/clubs/${club.id}?tab=edit`;
  const viewHref = `/dashboard/clubs/${club.id}`;

  return (
    <>
      {/* Desktop: icon buttons */}
      <div className="hidden gap-1 md:flex">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          asChild
          title={t("viewDetail")}
        >
          <Link href={viewHref} aria-label={t("viewDetailAria", { name: club.name })}>
            <Eye className="size-3.5" />
          </Link>
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            asChild
            title={t("editLabel")}
          >
            <Link href={editHref} aria-label={`${t("editLabel")} ${club.name}`}>
              <Pencil className="size-3.5" />
            </Link>
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteItem(club)}
            title={t("deleteLabel")}
            aria-label={t("deleteClub", { name: club.name })}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Mobile: DropdownMenu */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" title={t("actionsMenu", { name: club.name })} aria-label={t("actionsMenu", { name: club.name })}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={viewHref}>
                <Eye className="size-4" />
                {t("viewDetail")}
              </Link>
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem asChild>
                <Link href={editHref}>
                  <Pencil className="size-4" />
                  {t("editLabel")}
                </Link>
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteItem(club)}
              >
                <Trash2 className="size-4" />
                {t("deleteLabel")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* AlertDialog for delete confirmation */}
      {canDelete && (
        <AlertDialog
          open={!!deleteItem}
          onOpenChange={(open) => {
            if (!open) setDeleteItem(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDialogDescription", { name: deleteItem?.name ?? "" })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("deleteDialogCancel")}</AlertDialogCancel>
              <form action={deleteClubAction}>
                <input
                  type="hidden"
                  name="id"
                  value={String(deleteItem?.id ?? "")}
                />
                <DeleteButton />
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
