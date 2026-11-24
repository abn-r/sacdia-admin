"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SectionFormPageProps {
  sections: { id: string; title: string }[];
  children: ReactNode;
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  footerNote?: ReactNode;
}

export function SectionFormPage({
  sections,
  children,
  dirty,
  pending,
  onSave,
  onCancel,
  saveLabel,
  footerNote,
}: SectionFormPageProps) {
  const t = useTranslations("shared.kit.sectionForm");
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        const first = visible.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0];
        if (first) setActive(first.target.id);
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div data-slot="section-form-page" className="flex flex-col">
      <div className="grid gap-7 pb-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label={t("sections")} className="hidden lg:block">
          <ul className="sticky top-20 space-y-0.5">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active === section.id ? "location" : undefined}
                  onClick={() => setActive(section.id)}
                  className={cn(
                    "block h-8 truncate rounded-lg px-2.5 text-sm leading-8 text-muted-foreground transition-colors hover:text-foreground",
                    active === section.id && "bg-primary-soft font-medium text-primary-soft-foreground",
                  )}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-8">{children}</div>
      </div>
      <div
        data-slot="section-form-savebar"
        className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t bg-background px-4 py-3 sm:px-7"
      >
        <p className="text-sm text-muted-foreground">
          {footerNote ?? (dirty ? t("unsaved") : null)}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={onSave} loading={pending} disabled={pending}>
            {saveLabel ?? t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
