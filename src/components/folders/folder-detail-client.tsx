"use client";

import { useState, useCallback, Fragment } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Layers,
  CheckCircle2,
  Circle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderStatusBadge } from "@/components/folders/folder-status-badge";
import { fetchFolderFromClient } from "@/lib/api/folders";
import { ApiError } from "@/lib/api/client";
import type { FolderTemplate, FolderModule } from "@/lib/api/folders";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FolderDetailClientProps {
  initialFolder: FolderTemplate;
}

// ─── Module rows (expandable) ─────────────────────────────────────────────────

function ModuleRows({ module }: { module: FolderModule }) {
  const [open, setOpen] = useState(false);
  const sortedSections = [...(module.sections ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <Fragment>
      {/* Module header row */}
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setOpen((prev) => !prev)}
      >
        <TableCell className="w-8">
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">{module.name}</TableCell>
        <TableCell className="hidden text-muted-foreground sm:table-cell">
          {module.description ?? (
            <span className="italic text-muted-foreground/60">
              Sin descripción
            </span>
          )}
        </TableCell>
        <TableCell className="w-20 text-center">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {module.order}
          </span>
        </TableCell>
        <TableCell className="w-24 text-center">
          <Badge variant="outline" className="text-xs">
            {sortedSections.length}{" "}
            {sortedSections.length === 1 ? "sección" : "secciones"}
          </Badge>
        </TableCell>
      </TableRow>

      {/* Section child rows */}
      {open &&
        sortedSections.map((section) => (
          <TableRow key={section.section_id} className="bg-muted/30">
            <TableCell />
            <TableCell className="pl-8">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-5 items-center justify-center rounded-full border bg-background text-xs text-muted-foreground">
                  {section.order}
                </span>
                <span className="text-sm font-medium">{section.name}</span>
              </div>
            </TableCell>
            <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
              {section.description ?? (
                <span className="italic text-muted-foreground/60">
                  Sin descripción
                </span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {section.required ? (
                <CheckCircle2 className="mx-auto size-4 text-green-600" />
              ) : (
                <Circle className="mx-auto size-4 text-muted-foreground/40" />
              )}
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
      {open && sortedSections.length === 0 && (
        <TableRow className="bg-muted/20">
          <TableCell
            colSpan={5}
            className="py-3 pl-8 text-sm text-muted-foreground"
          >
            Este módulo no tiene secciones todavía.
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FolderDetailClient({ initialFolder }: FolderDetailClientProps) {
  const [folder, setFolder] = useState<FolderTemplate>(initialFolder);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedModules = [...(folder.modules ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  const totalSections = sortedModules.reduce(
    (acc, mod) => acc + (mod.sections?.length ?? 0),
    0,
  );

  // ─── Refresh ──────────────────────────────────────────────────────────────

  const refreshFolder = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const updated = await fetchFolderFromClient(folder.folder_id);
      setFolder(updated);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar la carpeta";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [folder.folder_id]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon-sm" asChild title="Volver a carpetas">
            <Link href="/dashboard/folders">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{folder.name}</h1>
              <FolderStatusBadge active={folder.active} />
            </div>
            {folder.description && (
              <p className="text-sm text-muted-foreground">{folder.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Layers className="size-3" />
                {sortedModules.length}{" "}
                {sortedModules.length === 1 ? "módulo" : "módulos"}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <FolderOpen className="size-3" />
                {totalSections}{" "}
                {totalSections === 1 ? "sección" : "secciones"}
              </span>
            </div>
          </div>
        </div>

        {/*
          NOTE: "Editar" action is intentionally hidden.
          PATCH /folders/folders/:id is not yet implemented on the backend.
          Re-enable once the endpoint exists.
        */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshFolder}
            disabled={isRefreshing}
            title="Actualizar"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="sr-only">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="structure">
        <TabsList>
          <TabsTrigger value="structure">Estructura</TabsTrigger>
          <TabsTrigger value="info">Información</TabsTrigger>
        </TabsList>

        {/* Structure tab */}
        <TabsContent value="structure" className="mt-4">
          {sortedModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Layers className="size-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Sin módulos</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Esta carpeta no tiene módulos ni secciones configurados todavía.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Módulo / Sección</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Descripción
                    </TableHead>
                    <TableHead className="w-20 text-center">Orden</TableHead>
                    <TableHead className="w-24 text-center">Secciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedModules.map((module) => (
                    <ModuleRows key={module.module_id} module={module} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Info tab */}
        <TabsContent value="info" className="mt-4">
          <div className="rounded-lg border border-border divide-y divide-border">
            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{folder.folder_id}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Nombre</span>
              <span>{folder.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Descripción</span>
              <span>
                {folder.description ?? (
                  <span className="italic text-muted-foreground/60">
                    Sin descripción
                  </span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Estado</span>
              <FolderStatusBadge active={folder.active} />
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Módulos</span>
              <span>{sortedModules.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Secciones totales</span>
              <span>{totalSections}</span>
            </div>
            {folder.created_at && (
              <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Creada</span>
                <span>
                  {new Date(folder.created_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {folder.updated_at && (
              <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Actualizada</span>
                <span>
                  {new Date(folder.updated_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}
