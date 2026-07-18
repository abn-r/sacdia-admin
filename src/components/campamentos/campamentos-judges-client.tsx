"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scale, Tent } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CamporeeJudgesPanel } from "@/components/camporee-scoring/camporee-judges-panel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
}: CampamentosJudgesClientProps) {
  const t = useTranslations("campamentos.pages.judges");
  const router = useRouter();
  const camporees = scope === "union" ? unionCamporees : localCamporees;

  const handleScopeChange = (nextScope: string) => {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbRoot"), href: "/dashboard/campamentos" },
          { label: t("title") },
        ]}
      />

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Label>{t("scopeLabel")}</Label>
          <Tabs value={scope} onValueChange={handleScopeChange}>
            <TabsList>
              <TabsTrigger value="local">{t("scopeLocal")}</TabsTrigger>
              <TabsTrigger value="union">{t("scopeUnion")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="w-full space-y-2 sm:max-w-md">
          <Label htmlFor="camporee-select">{t("camporeeLabel")}</Label>
          <Select
            value={camporeeId != null ? String(camporeeId) : "none"}
            onValueChange={handleCamporeeChange}
          >
            <SelectTrigger id="camporee-select">
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
      </div>

      {!camporeeId ? (
        <EmptyState
          icon={Scale}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="space-y-4">
          {selectedCamporee ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{selectedCamporee.name}</p>
                <p className="text-xs text-muted-foreground">
                  {scope === "union" ? t("scopeUnion") : t("scopeLocal")}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={
                    scope === "union"
                      ? `/dashboard/campamentos/union/${camporeeId}`
                      : `/dashboard/campamentos/${camporeeId}`
                  }
                >
                  <Tent className="mr-2 size-4" />
                  {t("openCamporee")}
                </Link>
              </Button>
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
