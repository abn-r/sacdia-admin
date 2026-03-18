import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="size-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="max-w-sm text-muted-foreground">
        La ruta que buscas no existe o fue movida.
      </p>
      <Button asChild>
        <Link href="/dashboard">Ir al Dashboard</Link>
      </Button>
    </div>
  );
}
