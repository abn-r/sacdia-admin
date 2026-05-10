"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getHonorById,
  listAdminRequirements,
  type Honor,
  type RequirementNode,
} from "@/lib/api/honors";

const RequirementsTree = dynamic(
  () =>
    import("@/components/honors/requirements-tree").then((m) => ({
      default: m.RequirementsTree,
    })),
  {
    loading: () => (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 flex-1" style={{ maxWidth: `${60 + (i % 3) * 15}%` }} />
            <div className="flex gap-1.5">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
);

const RequirementEditDialog = dynamic(
  () =>
    import("@/components/honors/requirement-edit-dialog").then((m) => ({
      default: m.RequirementEditDialog,
    })),
  {},
);

// ─── Types ────────────────────────────────────────────────────────────────────

type PageStatus = "loading" | "error" | "ready";

// ─── Component ────────────────────────────────────────────────────────────────

export default function HonorRequirementsPage() {
  const t = useTranslations("honors.pages.requirements");
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
      setErrorMessage(t("invalidIdError"));
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
          : t("invalidIdError");
      setErrorMessage(message);
      setStatus("error");
    }
  }, [honorId, t]);

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
        title={t("title")}
        description={status === "ready" ? honorName : undefined}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {t("backButton")}
          </Link>
        </Button>

        {status === "ready" && (
          <Button size="sm" onClick={() => setAddRootOpen(true)}>
            <Plus className="size-4" />
            {t("addButton")}
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
              {t("errorTitle")}
            </p>
            <p className="text-sm text-destructive/80">
              {errorMessage ?? t("invalidIdError")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void load()}
            >
              {t("retryButton")}
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

      {/* Dialog for top-level add button */}
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
