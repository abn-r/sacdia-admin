import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/ui/copy-button";

interface DirectorCellProps {
  director?: {
    nombre: string | null;
    club: string | null;
    user_id: string;
  } | null;
  /** Fallback UUID when no director relation is available. */
  fallbackId: string;
}

/**
 * Director identity of an order: name + club, or, when only the creator UUID is
 * known, a short id with a copy control.
 */
export function DirectorCell({ director, fallbackId }: DirectorCellProps) {
  const t = useTranslations("ops.materials.detail");
  const userId = director?.user_id ?? fallbackId;
  const nombre = director?.nombre?.trim() || null;
  const club = director?.club?.trim() || null;

  if (nombre) {
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{nombre}</span>
        <span className="text-sm text-muted-foreground">{club ?? "—"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-foreground">{t("directorUnknown", { id: userId.slice(0, 8) })}</span>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span className="font-mono text-xs">{userId}</span>
        <CopyButton text={userId} ariaLabel={t("copyDirectorId")} />
      </div>
    </div>
  );
}
