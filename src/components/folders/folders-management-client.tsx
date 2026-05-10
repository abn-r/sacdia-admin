"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  RefreshCw,
  ChevronRight,
  Search,
  FolderOpen,
  Layers,
  FileStack,
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
  const t = useTranslations("folders.management");
  const tErrors = useTranslations("folders.errors");

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
          : tErrors("refresh_failed");
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [tErrors]);

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
              placeholder={t("searchPlaceholder")}
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
            title={t("refreshButton")}
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="sr-only">{t("refreshButton")}</span>
          </Button>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {filteredFolders.length}
            </span>{" "}
            {t("folderCount", { count: filteredFolders.length })}
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
            {search ? t("noResultsTitle") : t("emptyTitle")}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {search
              ? t("noResultsDescription", { search })
              : t("emptyDescription")}
          </p>
        </div>
      )}

      {/* Table / Cards */}
      {filteredFolders.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tableHeaderName")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("tableHeaderDescription")}
                    </TableHead>
                    <TableHead className="hidden w-28 text-center md:table-cell">
                      {t("tableHeaderModules")}
                    </TableHead>
                    <TableHead className="hidden w-28 text-center lg:table-cell">
                      {t("tableHeaderSections")}
                    </TableHead>
                    <TableHead className="w-20 text-center">{t("tableHeaderStatus")}</TableHead>
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
                                {t("noDescription")}
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
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden" aria-label={t("ariaList")}>
            {filteredFolders.map((folder) => {
              const moduleCount = folder.modules?.length ?? 0;
              const sectionCount = countTotalSections(folder);

              return (
                <li key={folder.folder_id}>
                  <Link
                    href={`/dashboard/folders/${folder.folder_id}`}
                    className="block rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("ariaFolderLink", { name: folder.name })}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileStack className="size-5 text-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{folder.name}</p>
                        {folder.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {folder.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <FolderStatusBadge active={folder.active} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div>
                        <dt className="text-muted-foreground">{t("modulesLabel")}</dt>
                        <dd className="flex items-center gap-1">
                          <Layers className="size-3 text-muted-foreground" aria-hidden="true" />
                          {moduleCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("sectionsLabel")}</dt>
                        <dd>{sectionCount}</dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
