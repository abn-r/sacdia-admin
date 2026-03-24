"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<ValidationEntityType>("class");
  const [sectionId, setSectionId] = useState<string>("all");
  const [classValidations, setClassValidations] =
    useState<PendingValidation[]>(initialClasses);
  const [honorValidations, setHonorValidations] =
    useState<PendingValidation[]>(initialHonors);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isInitialMount = useRef(true);

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

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const query =
        sectionId !== "all"
          ? { section_id: parseInt(sectionId, 10) }
          : {};

      const [classes, honors] = await Promise.allSettled([
        getPendingValidations({ ...query, entity_type: "class" }),
        getPendingValidations({ ...query, entity_type: "honor" }),
      ]);

      if (classes.status === "fulfilled") {
        setClassValidations(classes.value);
      }
      if (honors.status === "fulfilled") {
        setHonorValidations(honors.value);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo actualizar la lista";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [sectionId]);

  // Refresh when section filter changes, skip on initial mount (data comes from server)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

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
                <SelectValue placeholder="Todas las secciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las secciones</SelectItem>
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
            <span className="font-medium text-foreground">{currentCount}</span>{" "}
            {currentCount === 1 ? "pendiente" : "pendientes"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ValidationEntityType)}>
        <TabsList>
          <TabsTrigger value="class">
            Clases
            {filteredClasses.length > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {filteredClasses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="honor">
            Especialidades
            {filteredHonors.length > 0 && (
              <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {filteredHonors.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="class" className="mt-4">
          <ValidationTable
            validations={filteredClasses}
            entityType="class"
            onRefresh={refresh}
          />
        </TabsContent>

        <TabsContent value="honor" className="mt-4">
          <ValidationTable
            validations={filteredHonors}
            entityType="honor"
            onRefresh={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
