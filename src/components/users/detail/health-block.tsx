"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailSection, DetailField, DetailCols2, DetailChipList } from "./section";

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
            <DetailChipList k={allergiesLabel} items={allergies} tone="destructive" />
          </div>
          <div>
            <DetailChipList k={diseasesLabel} items={diseases} tone="warning" />
            <DetailChipList
              k={medicinesLabel}
              items={medicines}
              tone="info"
              className="border-b-0"
            />
          </div>
        </DetailCols2>
      )}
    </DetailSection>
  );
}
