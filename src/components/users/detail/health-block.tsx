"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailSection, DetailField, DetailCols2 } from "./section";
import { cn } from "@/lib/utils";

export interface HealthBlockProps {
  num?: string;
  title: string;
  showLabel: string;
  hideLabel: string;
  protectedTitle: string;
  protectedDescription: string;
  emptyMessage: string;
  bloodLabel: string;
  bloodValue: string;
  allergiesLabel: string;
  diseasesLabel: string;
  medicinesLabel: string;
  allergies: string[];
  diseases: string[];
  medicines: string[];
  hasPayload: boolean;
}

export function HealthBlock({
  num = "03",
  title,
  showLabel,
  hideLabel,
  protectedTitle,
  protectedDescription,
  emptyMessage,
  bloodLabel,
  bloodValue,
  allergiesLabel,
  diseasesLabel,
  medicinesLabel,
  allergies,
  diseases,
  medicines,
  hasPayload,
}: HealthBlockProps) {
  const [open, setOpen] = useState(false);

  return (
    <DetailSection
      num={num}
      title={title}
      action={
        hasPayload ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {open ? hideLabel : showLabel}
          </Button>
        ) : null
      }
    >
      {!hasPayload ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : !open ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <ShieldAlert className="size-4" /> {protectedTitle}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            {protectedDescription}
          </div>
        </div>
      ) : (
        <DetailCols2>
          <div>
            <DetailField k={bloodLabel} v={bloodValue} />
            <ChipField label={allergiesLabel} chips={allergies} tone="destructive" />
          </div>
          <div>
            <ChipField label={diseasesLabel} chips={diseases} tone="warning" />
            <ChipField label={medicinesLabel} chips={medicines} tone="info" last />
          </div>
        </DetailCols2>
      )}
    </DetailSection>
  );
}

function ChipField({
  label,
  chips,
  tone,
  last,
}: {
  label: string;
  chips: string[];
  tone: "destructive" | "warning" | "info";
  last?: boolean;
}) {
  const toneClass =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "warning"
      ? "bg-warning/15 text-warning-foreground dark:text-warning"
      : "bg-info/10 text-info";

  return (
    <div className={cn("border-b border-dashed border-border/70 py-2.5", last && "border-b-0")}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {chips.length === 0 ? (
        <div className="text-sm italic text-muted-foreground/70">—</div>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                toneClass,
              )}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
