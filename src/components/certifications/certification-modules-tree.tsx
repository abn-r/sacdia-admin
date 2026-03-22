"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Section = {
  section_id: number;
  title: string;
  description?: string | null;
  order?: number | null;
  is_required?: boolean;
};

type Module = {
  module_id: number;
  title: string;
  description?: string | null;
  order?: number | null;
  sections: Section[];
};

interface ModuleNodeProps {
  mod: Module;
  defaultOpen?: boolean;
}

function ModuleNode({ mod, defaultOpen = false }: ModuleNodeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionCount = mod.sections?.length ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{mod.title}</p>
          {mod.description && (
            <p className="truncate text-xs text-muted-foreground">{mod.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {sectionCount} {sectionCount === 1 ? "sección" : "secciones"}
        </Badge>
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {sectionCount === 0 ? (
            <p className="text-sm text-muted-foreground">Sin secciones registradas.</p>
          ) : (
            <ul className="space-y-2">
              {mod.sections.map((section) => (
                <li
                  key={section.section_id}
                  className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/20"
                >
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{section.title}</p>
                    {section.description && (
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                  {section.is_required && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Requerido
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface CertificationModulesTreeProps {
  modules: Module[];
}

export function CertificationModulesTree({ modules }: CertificationModulesTreeProps) {
  const [allOpen, setAllOpen] = useState(false);
  const [key, setKey] = useState(0);

  function toggleAll() {
    setAllOpen((prev) => !prev);
    setKey((prev) => prev + 1);
  }

  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta certificación no tiene módulos registrados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
        </p>
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allOpen ? "Colapsar todos" : "Expandir todos"}
        </Button>
      </div>
      <div
        key={key}
        className={cn("space-y-2")}
      >
        {modules.map((mod, idx) => (
          <ModuleNode
            key={mod.module_id}
            mod={mod}
            defaultOpen={allOpen || idx === 0}
          />
        ))}
      </div>
    </div>
  );
}
