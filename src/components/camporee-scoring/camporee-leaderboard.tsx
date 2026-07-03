import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CamporeeLeaderboard as CamporeeLeaderboardData } from "@/lib/api/camporee-scoring";

export interface CamporeeLeaderboardProps {
  leaderboard?: CamporeeLeaderboardData | null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function CamporeeLeaderboard({ leaderboard }: CamporeeLeaderboardProps) {
  const rows = leaderboard?.rows ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4" />
          Leaderboard del camporee
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay resultados oficiales para mostrar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead className="text-right">Puntos obtenidos</TableHead>
                <TableHead className="text-right">Puntos máximos</TableHead>
                <TableHead className="text-right">Porcentaje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.club_section_id}-${row.rank}`}>
                  <TableCell className="font-medium">#{row.rank}</TableCell>
                  <TableCell>{row.club_name ?? "—"}</TableCell>
                  <TableCell>{row.section_name ?? `Sección ${row.club_section_id}`}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.total_awarded_points)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.total_max_points)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.percentage)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
