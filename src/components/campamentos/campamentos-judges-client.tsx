"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import type { ErrorStateFromError } from "@/lib/api/error-state";
import { CamporeeJudgesPanel } from "@/components/camporee-scoring/camporee-judges-panel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Segmented } from "@/components/shared/segmented";
import { Button } from "@/components/ui/button";
import type { Camporee } from "@/lib/api/camporees";
import type {
  CamporeeJudge,
  CamporeeJudgeCandidate,
} from "@/lib/api/camporee-scoring";

export type CamporeeJudgeScope = "local" | "union";

export interface CampamentosJudgesClientProps {
  scope: CamporeeJudgeScope;
  camporeeId: number | null;
  localCamporees: Camporee[];
  unionCamporees: Camporee[];
  judges: CamporeeJudge[];
  judgeCandidates: CamporeeJudgeCandidate[];
  judgeCandidatesError: string | null;
  canEdit: boolean;
  /** The lists could not be loaded: show the error, never an empty roster. */
  loadFailure?: ErrorStateFromError | null;
}

function resolveCamporeeId(camporee: Camporee): number | null {
  const id = camporee.local_camporee_id ?? camporee.camporee_id ?? camporee.id;
  return typeof id === "number" && id > 0 ? id : null;
}

function formatCamporeeLabel(camporee: Camporee): string {
  const id = resolveCamporeeId(camporee);
  const suffix = id ? ` (#${id})` : "";
  return `${camporee.name}${suffix}`;
}

export function CampamentosJudgesClient({
  scope,
  camporeeId,
  localCamporees,
  unionCamporees,
  judges,
  judgeCandidates,
  judgeCandidatesError,
  canEdit,
  loadFailure = null,
}: CampamentosJudgesClientProps) {
  const t = useTranslations("campamentos.pages.judges");
  const router = useRouter();
  const camporees = scope === "union" ? unionCamporees : localCamporees;

  const handleScopeChange = (nextScope: CamporeeJudgeScope) => {
    if (nextScope === scope) return;

    const params = new URLSearchParams();
    params.set("scope", nextScope);
    router.push(`/dashboard/campamentos/jueces?${params.toString()}`);
  };

  const handleCamporeeChange = (value: string) => {
    const currentValue = camporeeId != null ? String(camporeeId) : "none";
    if (value === currentValue) return;

    const params = new URLSearchParams();
    params.set("scope", scope);
    if (value !== "none") params.set("camporeeId", value);
    router.push(`/dashboard/campamentos/jueces?${params.toString()}`);
  };

  const selectedCamporee =
    camporeeId != null
      ? camporees.find((item) => resolveCamporeeId(item) === camporeeId) ?? null
      : null;

  const camporeeHref =
    camporeeId == null
      ? null
      : scope === "union"
        ? `/dashboard/campamentos/union/${camporeeId}`
        : `/dashboard/campamentos/${camporeeId}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbRoot"), href: "/dashboard/campamentos" },
          { label: t("title") },
        ]}
      />

      {/* Plain filter row: no floating, blurred or glass layer. */}
      <section className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-6">
        <div className="space-y-2">
          <Label id="judges-scope-label" className="text-xs font-medium text-muted-foreground">
            {t("scopeLabel")}
          </Label>
          <Segmented
            labelledBy="judges-scope-label"
            value={scope}
            onChange={handleScopeChange}
            options={[
              { value: "local", label: t("scopeLocal") },
              { value: "union", label: t("scopeUnion") },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="camporee-select" className="text-xs font-medium text-muted-foreground">
            {t("camporeeLabel")}
          </Label>
          <Select
            value={camporeeId != null ? String(camporeeId) : "none"}
            onValueChange={handleCamporeeChange}
          >
            <SelectTrigger id="camporee-select" className="w-full">
              <SelectValue placeholder={t("camporeePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("camporeePlaceholder")}</SelectItem>
              {camporees.map((camporee) => {
                const id = resolveCamporeeId(camporee);
                if (!id) return null;
                return (
                  <SelectItem key={id} value={String(id)}>
                    {formatCamporeeLabel(camporee)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </section>

      {loadFailure ? (
        <ErrorState kind={loadFailure.kind} detail={loadFailure.detail} retry />
      ) : !camporeeId ? (
        <EmptyState
          icon={Scale}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="space-y-6">
          {selectedCamporee ? (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {scope === "union" ? t("scopeUnion") : t("scopeLocal")}
                </p>
                <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {selectedCamporee.name}
                </h2>
              </div>
              {camporeeHref ? (
                <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                  <Link href={camporeeHref}>
                    {t("openCamporee")}
                    <ExternalLink className="size-4" aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          <CamporeeJudgesPanel
            camporeeId={camporeeId}
            isUnionCamporee={scope === "union"}
            judges={judges}
            judgeCandidates={judgeCandidates}
            judgeCandidatesError={judgeCandidatesError}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
}
