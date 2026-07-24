"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Scale } from "lucide-react";
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
import { PAGE_ENTER_CLASSES, STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
import { cn } from "@/lib/utils";
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

  const camporeeHref =
    camporeeId == null
      ? null
      : scope === "union"
        ? `/dashboard/campamentos/union/${camporeeId}`
        : `/dashboard/campamentos/${camporeeId}`;

  return (
    <div className={cn("space-y-8", PAGE_ENTER_CLASSES)}>
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbRoot"), href: "/dashboard/campamentos" },
          { label: t("title") },
        ]}
      />

      {/* Floating control chrome — material layer, not a nested card stack */}
      <section
        className={cn(
          "sticky top-2 z-10 rounded-2xl p-1",
          "bg-background/70 shadow-sm ring-1 ring-foreground/10",
          "backdrop-blur-xl backdrop-saturate-150",
          "supports-backdrop-filter:bg-background/55",
          "motion-reduce:backdrop-blur-none motion-reduce:bg-card",
          STAGGER_CLASSES,
        )}
        style={getStaggerStyle(0, 40)}
      >
        <div className="grid gap-4 rounded-[calc(1rem-0.125rem)] bg-card/80 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t("scopeLabel")}
            </Label>
            <Tabs value={scope} onValueChange={handleScopeChange}>
              <TabsList className="h-9">
                <TabsTrigger value="local" className="px-4">
                  {t("scopeLocal")}
                </TabsTrigger>
                <TabsTrigger value="union" className="px-4">
                  {t("scopeUnion")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="camporee-select"
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
            >
              {t("camporeeLabel")}
            </Label>
            <Select
              value={camporeeId != null ? String(camporeeId) : "none"}
              onValueChange={handleCamporeeChange}
            >
              <SelectTrigger id="camporee-select" className="h-10 w-full">
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
      </section>

      {!camporeeId ? (
        <EmptyState
          icon={Scale}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="space-y-6">
          {selectedCamporee ? (
            <div
              className={cn(
                "flex flex-wrap items-end justify-between gap-4",
                STAGGER_CLASSES,
              )}
              style={getStaggerStyle(1, 40)}
            >
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {scope === "union" ? t("scopeUnion") : t("scopeLocal")}
                </p>
                <h2 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-tight sm:tracking-[-0.02em]">
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
