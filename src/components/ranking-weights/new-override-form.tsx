"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeightsForm } from "./weights-form";
import { createRankingWeights } from "@/lib/api/ranking-weights";
import { listClubTypes } from "@/lib/api/catalogs";
import type { ClubType } from "@/lib/api/catalogs";

// ─── Props ────────────────────────────────────────────────────────────────────

interface NewOverrideFormProps {
  existingClubTypeIds: number[];
  onCreated: () => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewOverrideForm({
  existingClubTypeIds,
  onCreated,
}: NewOverrideFormProps) {
  const [types, setTypes] = useState<ClubType[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    listClubTypes()
      .then((rows) => {
        setTypes(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setTypes([]));
  }, []);

  const available = types.filter(
    (t) => !existingClubTypeIds.includes(t.club_type_id),
  );

  return (
    <div className="space-y-4">
      <Select
        onValueChange={(v) => setSelected(parseInt(v, 10))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar tipo de club" />
        </SelectTrigger>
        <SelectContent>
          {available.length === 0 ? (
            <SelectItem value="__none" disabled>
              Sin tipos disponibles
            </SelectItem>
          ) : (
            available.map((t) => (
              <SelectItem
                key={t.club_type_id}
                value={String(t.club_type_id)}
              >
                {t.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selected != null && (
        <WeightsForm
          initial={{
            folder_weight: 60,
            finance_weight: 15,
            camporee_weight: 15,
            evidence_weight: 10,
          }}
          submitLabel="Crear override"
          onSubmit={async (values) => {
            await createRankingWeights({
              club_type_id: selected,
              ...values,
            });
            await onCreated();
          }}
        />
      )}
    </div>
  );
}
