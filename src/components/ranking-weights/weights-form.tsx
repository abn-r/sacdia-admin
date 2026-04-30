"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeightInput } from "./weight-input";
import { WeightSumIndicator } from "./weight-sum-indicator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeightsValues {
  folder_weight: number;
  finance_weight: number;
  camporee_weight: number;
  evidence_weight: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeightsFormProps {
  initial: WeightsValues;
  submitLabel?: string;
  onSubmit: (values: WeightsValues) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeightsForm({
  initial,
  submitLabel = "Guardar",
  onSubmit,
}: WeightsFormProps) {
  const [v, setV] = useState<WeightsValues>(initial);
  const [busy, setBusy] = useState(false);

  const sum =
    v.folder_weight + v.finance_weight + v.camporee_weight + v.evidence_weight;
  const ok = sum === 100;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ok || busy) return;
        try {
          setBusy(true);
          await onSubmit(v);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <WeightInput
          id="folder"
          label="Folder"
          value={v.folder_weight}
          onChange={(n) => setV({ ...v, folder_weight: n })}
        />
        <WeightInput
          id="finance"
          label="Finance"
          value={v.finance_weight}
          onChange={(n) => setV({ ...v, finance_weight: n })}
        />
        <WeightInput
          id="camporee"
          label="Camporee"
          value={v.camporee_weight}
          onChange={(n) => setV({ ...v, camporee_weight: n })}
        />
        <WeightInput
          id="evidence"
          label="Evidence"
          value={v.evidence_weight}
          onChange={(n) => setV({ ...v, evidence_weight: n })}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <WeightSumIndicator sum={sum} />
        <Button type="submit" disabled={!ok || busy}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              Guardando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
