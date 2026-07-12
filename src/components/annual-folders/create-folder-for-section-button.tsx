"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createFolderForSection } from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import { usePanelPath } from "@/lib/v2/panel-path-context";

type CreateFolderForSectionButtonProps = {
  sectionId: number;
};

export function CreateFolderForSectionButton({
  sectionId,
}: CreateFolderForSectionButtonProps) {
  const t = useTranslations("annual_folders");
  const router = useRouter();
  const { toPanelPath } = usePanelPath();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    try {
      const folder = await createFolderForSection(sectionId);
      toast.success(t("toasts.folder_created"));
      router.push(
        toPanelPath(
          `/dashboard/annual-folders?folder=${encodeURIComponent(
            folder.annual_folder_id,
          )}`,
        ),
      );
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("errors.create_folder_failed");
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Button type="button" onClick={handleCreate} disabled={isCreating}>
      <FolderPlus className="size-4" aria-hidden="true" />
      {isCreating ? t("page.creatingFolder") : t("page.createFolder")}
    </Button>
  );
}
