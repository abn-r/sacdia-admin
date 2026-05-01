import { Tent, CalendarRange, MapPin, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Camporee } from "@/lib/api/camporees";

interface CamporeeInfoCardProps {
  camporee: Camporee;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function CamporeeInfoCard({ camporee }: CamporeeInfoCardProps) {
  const clubTypeBadges: React.ReactNode[] = [];
  if (camporee.includes_adventurers) {
    clubTypeBadges.push(
      <Badge key="adv" variant="secondary">
        Aventureros
      </Badge>,
    );
  }
  if (camporee.includes_pathfinders) {
    clubTypeBadges.push(
      <Badge key="path" variant="secondary">
        Conquistadores
      </Badge>,
    );
  }
  if (camporee.includes_master_guides) {
    clubTypeBadges.push(
      <Badge key="mg" variant="secondary">
        Guías Mayores
      </Badge>,
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start gap-6">
          {/* Icon */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Tent className="size-6 text-primary" />
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-bold">{camporee.name}</h2>
              {camporee.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {camporee.description}
                </p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarRange className="size-3.5 shrink-0" />
                {formatDate(camporee.start_date)} — {formatDate(camporee.end_date)}
              </span>
              {camporee.local_camporee_place && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {camporee.local_camporee_place}
                </span>
              )}
              {camporee.registration_cost != null && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5 shrink-0" />
                  {camporee.registration_cost.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              )}
            </div>

            {/* Club type badges */}
            {clubTypeBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">{clubTypeBadges}</div>
            )}
          </div>

          {/* Status badge */}
          <Badge variant={camporee.active !== false ? "default" : "outline"}>
            {camporee.active !== false ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
