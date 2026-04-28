import { Badge } from "@/components/ui/badge";

interface ClassStatusBadgeProps {
  active: boolean;
}

export function ClassStatusBadge({ active }: ClassStatusBadgeProps) {
  return (
    <Badge variant={active ? "default" : "outline"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}
