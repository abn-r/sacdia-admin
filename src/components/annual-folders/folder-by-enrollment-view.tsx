"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FolderByEnrollmentViewProps {
  currentEnrollmentId: string | null;
  currentFolderId: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FolderByEnrollmentView({
  currentEnrollmentId,
  currentFolderId,
}: FolderByEnrollmentViewProps) {
  const router = useRouter();
  const [enrollmentInput, setEnrollmentInput] = useState(
    currentEnrollmentId ?? "",
  );
  const [folderInput, setFolderInput] = useState(
    currentFolderId ?? "",
  );

  function handleSearchByEnrollment(e: React.FormEvent) {
    e.preventDefault();
    const id = enrollmentInput.trim();
    if (id) {
      router.push(`/dashboard/annual-folders?enrollment=${encodeURIComponent(id)}`);
    }
  }

  function handleSearchByFolder(e: React.FormEvent) {
    e.preventDefault();
    const id = folderInput.trim();
    if (id) {
      router.push(`/dashboard/annual-folders?folder=${encodeURIComponent(id)}`);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-sm font-medium">Buscar carpeta</p>
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* By enrollment ID */}
        <form
          onSubmit={handleSearchByEnrollment}
          className="flex flex-1 items-end gap-2"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="enrollment-id" className="text-xs text-muted-foreground">
              Por ID de inscripción
            </Label>
            <Input
              id="enrollment-id"
              type="text"
              placeholder="UUID de inscripción"
              value={enrollmentInput}
              onChange={(e) => setEnrollmentInput(e.target.value)}
              className="h-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={!enrollmentInput.trim()}>
            <Search className="size-4" />
            Buscar
          </Button>
        </form>

        <div className="hidden h-auto w-px bg-border sm:block" />

        {/* By folder ID */}
        <form
          onSubmit={handleSearchByFolder}
          className="flex flex-1 items-end gap-2"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="folder-id" className="text-xs text-muted-foreground">
              Por ID de carpeta
            </Label>
            <Input
              id="folder-id"
              type="text"
              placeholder="UUID de carpeta"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              className="h-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={!folderInput.trim()}>
            <Search className="size-4" />
            Buscar
          </Button>
        </form>
      </div>
    </div>
  );
}
