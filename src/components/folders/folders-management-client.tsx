"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ChevronRight,
  Search,
  FolderOpen,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderStatusBadge } from "@/components/folders/folder-status-badge";
import { fetchFoldersFromClient, extractFolders } from "@/lib/api/folders";
import { ApiError } from "@/lib/api/client";
import type { FolderTemplate } from "@/lib/api/folders";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FoldersManagementClientProps {
  initialFolders: FolderTemplate[];
}

function countTotalSections(folder: FolderTemplate): number {
  return (folder.modules ?? []).reduce(
    (acc, mod) => acc + (mod.sections?.length ?? 0),
    0,
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FoldersManagementClient({
  initialFolders,
}: FoldersManagementClientProps) {
  const [folders, setFolders] = useState<FolderTemplate[]>(initialFolders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // ─── Refresh ──────────────────────────────────────────────────────────────

  const refreshFolders = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const payload = await fetchFoldersFromClient();
      setFolders(extractFolders(payload));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron actualizar las carpetas";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ─── Filtered list ────────────────────────────────────────────────────────

  const filteredFolders = folders.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.description ?? "").toLowerCase().includes(q)
    );
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      {/*
        NOTE: "Nueva carpeta", edit, and delete actions are intentionally hidden.
        The backend FoldersController only exposes GET /folders/folders and
        GET /folders/folders/:id. POST, PATCH, and DELETE endpoints do not exist
        yet. Re-enable these actions once the backend implements them.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar carpeta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-56 pl-8 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshFolders}
            disabled={isRefreshing}
            title="Actualizar"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="sr-only">Actualizar</span>
          </Button>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {filteredFolders.length}
            </span>{" "}
            {filteredFolders.length === 1 ? "carpeta" : "carpetas"}
          </p>
        </div>
      </div>

      {/* Empty state — no results */}
      {filteredFolders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            {search ? (
              <Search className="size-6 text-muted-foreground" />
            ) : (
              <FolderOpen className="size-6 text-muted-foreground" />
            )}
          </div>
          <h3 className="mt-4 text-base font-semibold">
            {search ? "Sin resultados" : "Sin carpetas"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {search
              ? `No se encontraron carpetas que coincidan con "${search}".`
              : "No hay carpetas de evidencias configuradas todavía."}
          </p>
        </div>
      )}

      {/* Table */}
      {filteredFolders.length > 0 && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Descripción
                </TableHead>
                <TableHead className="hidden w-28 text-center md:table-cell">
                  Módulos
                </TableHead>
                <TableHead className="hidden w-28 text-center lg:table-cell">
                  Secciones
                </TableHead>
                <TableHead className="w-20 text-center">Estado</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFolders.map((folder) => {
                const moduleCount = folder.modules?.length ?? 0;
                const sectionCount = countTotalSections(folder);

                return (
                  <TableRow
                    key={folder.folder_id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link
                        href={`/dashboard/folders/${folder.folder_id}`}
                        className="block font-medium hover:underline"
                      >
                        {folder.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden max-w-xs text-muted-foreground sm:table-cell">
                      <span className="line-clamp-1">
                        {folder.description ?? (
                          <span className="italic text-muted-foreground/60">
                            Sin descripción
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-center md:table-cell">
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Layers className="size-3" />
                        {moduleCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-center lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {sectionCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <FolderStatusBadge active={folder.active} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/folders/${folder.folder_id}`}>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
