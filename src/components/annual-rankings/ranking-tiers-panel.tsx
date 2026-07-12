"use client";

import { useState } from "react";
import { Loader2, Medal, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rankingTierSchema } from "@/lib/annual-rankings/annual-ranking-config-validation";
import {
  updateRankingTier,
  type RankingTier,
} from "@/lib/api/annual-rankings";

interface RankingTiersPanelProps {
  initialTiers: RankingTier[];
}

export function RankingTiersPanel({ initialTiers }: RankingTiersPanelProps) {
  const [tiers, setTiers] = useState(initialTiers);
  const [tierDrafts, setTierDrafts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initialTiers.map((tier) => [tier.ranking_tier_id, tier.band_percentage]),
    ),
  );
  const [savingTierId, setSavingTierId] = useState<string | null>(null);

  async function handleSaveTier(tier: RankingTier) {
    const draft = tierDrafts[tier.ranking_tier_id];
    const parsed = rankingTierSchema.safeParse({
      ...tier,
      band_percentage: draft,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Porcentaje inválido");
      return;
    }

    setSavingTierId(tier.ranking_tier_id);
    try {
      const updated = await updateRankingTier(tier.ranking_tier_id, {
        name: tier.name,
        band_percentage: parsed.data.band_percentage,
        color: tier.color,
        icon: tier.icon,
        sort_order: tier.sort_order,
        active: tier.active,
      });
      setTiers((current) =>
        current.map((row) =>
          row.ranking_tier_id === updated.ranking_tier_id ? updated : row,
        ),
      );
      toast.success("Rango actualizado");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(message);
    } finally {
      setSavingTierId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Medal className="size-[18px] text-primary" />
          </div>
          <div>
            <CardTitle>Rangos globales de reconocimiento</CardTitle>
            <CardDescription>
              Estos porcentajes aplican a todo el sistema. El puntaje mínimo de
              cada rango se calcula según el máximo anual efectivo de cada club.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rango</TableHead>
              <TableHead>Porcentaje de banda</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => (
              <TableRow key={tier.ranking_tier_id}>
                <TableCell className="font-medium">{tier.name}</TableCell>
                <TableCell>
                  <div className="flex max-w-40 items-center gap-2">
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={tierDrafts[tier.ranking_tier_id] ?? ""}
                      onChange={(event) =>
                        setTierDrafts((current) => ({
                          ...current,
                          [tier.ranking_tier_id]: Number(event.target.value),
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={tier.active ? "secondary" : "outline"}>
                    {tier.active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingTierId === tier.ranking_tier_id}
                    onClick={() => handleSaveTier(tier)}
                  >
                    {savingTierId === tier.ranking_tier_id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Save />
                    )}
                    Guardar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
