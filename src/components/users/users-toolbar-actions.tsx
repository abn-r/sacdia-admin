"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";

export function UsersToolbarActions() {
  const { canCapability } = useScreenAccess();
  const t = useTranslations("users.pages.list");

  const canCreate = canCapability("users", "create");
  const canBulkCreate = canCapability("users", "bulk_create");

  if (!canCreate && !canBulkCreate) return null;

  return (
    <div className="flex items-center gap-2">
      {canBulkCreate ? (
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/users/bulk-upload" className="inline-flex items-center gap-1.5">
            <Upload className="size-4" aria-hidden="true" />
            {t("actions.bulkUpload")}
          </Link>
        </Button>
      ) : null}
      {canCreate ? (
        <Button asChild size="sm">
          <Link href="/dashboard/users/new" className="inline-flex items-center gap-1.5">
            <UserPlus className="size-4" aria-hidden="true" />
            {t("actions.addUser")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
