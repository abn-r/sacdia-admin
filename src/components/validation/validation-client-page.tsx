"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ValidationTable } from "@/components/validation/validation-table";
import {
  getPendingValidations,
  type PendingValidation,
  type ValidationEntityType,
} from "@/lib/api/validation";
import { ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = { section_id: number; name: string };

interface ValidationClientPageProps {
  initialClasses: PendingValidation[];
  initialHonors: PendingValidation[];
  sections: Section[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidationClientPage({
  initialClasses,
  initialHonors,
  sections,
}: ValidationClientPageProps) {
  const t = useTranslations("validation_admin");
  const [activeTab, setActiveTab] = useState<ValidationEntityType>("class");
  const [sectionId, setSectionId] = useState<string>("all");

  const sectionParam =
    sectionId !== "all" ? parseInt(sectionId, 10) : undefined;

  const {
    data: classValidations = [],
    isFetching: isRefreshingClasses,
    refetch: refetchClasses,
  } = useQuery<PendingValidation[], Error>({
    queryKey: ["validation", "classes", sectionParam],
    queryFn: () =>
      getPendingValidations({
        entity_type: "class",
        ...(sectionParam !== undefined ? { section_id: sectionParam } : {}),
      }),
    // initialData only applies when sectionId === "all" (matches server-rendered data)
    initialData: sectionId === "all" ? initialClasses : undefined,
    staleTime: 60_000,
  });

  const {
    data: honorValidations = [],
    isFetching: isRefreshingHonors,
    refetch: refetchHonors,
  } = useQuery<PendingValidation[], Error>({
    queryKey: ["validation", "honors", sectionParam],
    queryFn: () =>
      getPendingValidations({
        entity_type: "honor",
        ...(sectionParam !== undefined ? { section_id: sectionParam } : {}),
      }),
    // initialData only applies when sectionId === "all" (matches server-rendered data)
    initialData: sectionId === "all" ? initialHonors : undefined,
    staleTime: 60_000,
  });

  const isRefreshing = isRefreshingClasses || isRefreshingHonors;

  // Filter client-side when section changes (TanStack re-fetches automatically via queryKey)
  const filteredClasses =
    sectionId === "all"
      ? classValidations
      : classValidations.filter(
          (v) => v.section?.section_id === parseInt(sectionId, 10),
        );

  const filteredHonors =
    sectionId === "all"
      ? honorValidations
      : honorValidations.filter(
          (v) => v.section?.section_id === parseInt(sectionId, 10),
        );

  const handleRefresh = async () => {
    const [classResult, honorResult] = await Promise.allSettled([
      refetchClasses(),
      refetchHonors(),
    ]);

    const errors = [classResult, honorResult].filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    if (errors.length > 0) {
      const error = errors[0]?.reason as unknown;
      const message =
        error instanceof ApiError ? error.message : t("errors.refresh");
      toast.error(message);
    }
  };

  const currentCount =
    activeTab === "class" ? filteredClasses.length : filteredHonors.length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {sections.length > 0 && (
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder={t("client.filters.allSections")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("client.filters.allSections")}</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.section_id} value={String(s.section_id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {t("client.count", { count: currentCount })}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("client.refresh")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ValidationEntityType)}>
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="gap-4">
            <TabsTrigger value="class" className="whitespace-nowrap">
              {t("client.tabs.class")}
              {filteredClasses.length > 0 && (
                <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {filteredClasses.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="honor" className="whitespace-nowrap">
              {t("client.tabs.honor")}
              {filteredHonors.length > 0 && (
                <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {filteredHonors.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="class" className="mt-4">
          <ValidationTable
            validations={filteredClasses}
            entityType="class"
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="honor" className="mt-4">
          <ValidationTable
            validations={filteredHonors}
            entityType="honor"
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
