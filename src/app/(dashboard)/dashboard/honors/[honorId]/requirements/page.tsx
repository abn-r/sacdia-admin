"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { RequirementsTree } from "@/components/honors/requirements-tree";
import { RequirementEditDialog } from "@/components/honors/requirement-edit-dialog";
import {
  getHonorById,
  listAdminRequirements,
  type Honor,
  type RequirementNode,
} from "@/lib/api/honors";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageStatus = "loading" | "error" | "ready";

// ─── Component ────────────────────────────────────────────────────────────────

export default function HonorRequirementsPage() {
  const params = useParams<{ honorId: string }>();
  const honorId = Number(params.honorId);

  const [status, setStatus] = useState<PageStatus>("loading");
  const [honor, setHonor] = useState<Honor | null>(null);
  const [requirements, setRequirements] = useState<RequirementNode[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create-root dialog state
  const [addRootOpen, setAddRootOpen] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!Number.isFinite(honorId) || honorId <= 0) {
      setErrorMessage("ID de especialidad inválido.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const [honorData, requirementsData] = await Promise.all([
        getHonorById(honorId) as Promise<Honor>,
        listAdminRequirements(honorId) as Promise<RequirementNode[]>,
      ]);

      setHonor(honorData);
      // Normalize to array in case the API wraps in { data: [] }
      const items = Array.isArray(requirementsData)
        ? requirementsData
        : ((requirementsData as unknown as { data?: RequirementNode[] })?.data ?? []);
      setRequirements(items);
      setStatus("ready");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los requisitos.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [honorId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  // Called by RequirementsTree when any mutation happens.
  const handleDataChange = useCallback(() => {
    void load();
  }, [load]);

  // ─── Derived ─────────────────────────────────────────────────────────────

  const honorName =
    honor?.name ?? honor?.title ?? `Especialidad #${honorId}`;

  const backHref = `/dashboard/honors/${honorId}`;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisitos"
        description={status === "ready" ? honorName : undefined}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>

        {status === "ready" && (
          <Button size="sm" onClick={() => setAddRootOpen(true)}>
            <Plus className="size-4" />
            Agregar requisito
          </Button>
        )}
      </PageHeader>

      {/* Loading */}
      {status === "loading" && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">
              No se pudo cargar la información
            </p>
            <p className="text-sm text-destructive/80">
              {errorMessage ?? "Error desconocido."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void load()}
            >
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {status === "ready" && (
        <RequirementsTree
          honorId={honorId}
          initialData={requirements}
          onDataChange={handleDataChange}
        />
      )}

      {/* Dialog for top-level "Agregar requisito" button */}
      <RequirementEditDialog
        open={addRootOpen}
        onOpenChange={setAddRootOpen}
        mode="create"
        honorId={honorId}
        nextNumber={requirements.length + 1}
        parentId={null}
        onSuccess={handleDataChange}
      />
    </div>
  );
}
