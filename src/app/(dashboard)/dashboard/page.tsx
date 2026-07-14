import { LayoutDashboard } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";

export default function DashboardHomePage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">{APP_CONFIG.name}</h1>
        <p className="text-muted-foreground text-sm">
          Panel en reconstrucción con Studio Admin. Los módulos se irán agregando desde aquí.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Base lista</CardTitle>
            <CardDescription>Shell Studio Admin + autenticación SACDIA operativos.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Usa el sidebar y los controles de layout/tema para validar el cascarón antes de migrar módulos.
        </CardContent>
      </Card>
    </div>
  );
}
