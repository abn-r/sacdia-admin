"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanManageUsers } from "@/lib/auth/use-can-manage-users";

export function UsersToolbarActions() {
  const canManage = useCanManageUsers();
  const t = useTranslations("users.pages.list");

  if (!canManage) return null;

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/users/bulk-upload" className="inline-flex items-center gap-1.5">
          <Upload className="size-4" aria-hidden="true" />
          {t("actions.bulkUpload")}
        </Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/dashboard/users/new" className="inline-flex items-center gap-1.5">
          <UserPlus className="size-4" aria-hidden="true" />
          {t("actions.addUser")}
        </Link>
      </Button>
    </div>
  );
}
