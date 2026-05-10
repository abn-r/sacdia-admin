"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, FileText, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClassModule, ClassSection } from "@/lib/api/classes";

// ─── Section Node ─────────────────────────────────────────────────────────────

interface SectionNodeProps {
  section: ClassSection;
}

function SectionNode({ section }: SectionNodeProps) {
  const t = useTranslations("classes.tree");
  const title = section.title ?? section.name ?? t("section_fallback", { id: section.section_id });
  const requirementsCount = section.requirements?.length ?? 0;

  return (
    <li className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/20">
      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {section.description && (
          <p className="text-xs text-muted-foreground">{section.description}</p>
        )}
        {requirementsCount > 0 && (
          <div className="mt-1.5 space-y-1 pl-1">
            {section.requirements!.map((req) => (
              <div
                key={req.requirement_id}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <ListChecks className="mt-0.5 size-3 shrink-0" />
                <span>{req.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {section.active === false && (
        <Badge variant="outline" className="shrink-0 text-xs">
          {t("status_inactive")}
        </Badge>
      )}
    </li>
  );
}

// ─── Module Node ──────────────────────────────────────────────────────────────

interface ModuleNodeProps {
  mod: ClassModule;
  defaultOpen?: boolean;
}

function ModuleNode({ mod, defaultOpen = false }: ModuleNodeProps) {
  const t = useTranslations("classes.tree");
  const [open, setOpen] = useState(defaultOpen);
  const sections = mod.sections ?? [];
  const sectionCount = sections.length > 0 ? sections.length : (mod.sections_count ?? 0);
  const title = mod.title ?? mod.name ?? t("module_fallback", { id: mod.module_id });

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
          <p className="truncate text-sm font-semibold">{title}</p>
          {mod.description && (
            <p className="truncate text-xs text-muted-foreground">{mod.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {t("sections_count", { count: sectionCount })}
        </Badge>
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("no_sections")}</p>
          ) : (
            <ul className="space-y-2">
              {sections.map((section) => (
                <SectionNode key={section.section_id} section={section} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tree Root ────────────────────────────────────────────────────────────────

interface ClassModuleTreeProps {
  modules: ClassModule[];
}

export function ClassModuleTree({ modules }: ClassModuleTreeProps) {
  const t = useTranslations("classes.tree");
  const [allOpen, setAllOpen] = useState(false);
  const [key, setKey] = useState(0);

  function toggleAll() {
    setAllOpen((prev) => !prev);
    setKey((prev) => prev + 1);
  }

  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("no_modules")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("modules_count", { count: modules.length })}
        </p>
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allOpen ? t("collapse_all") : t("expand_all")}
        </Button>
      </div>
      <div key={key} className={cn("space-y-2")}>
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
