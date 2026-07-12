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
 * Renders the director identity for an order:
 *  - Full name + club when both are present.
 *  - Just the name (plus em-dash) when club is missing.
 *  - "Director (id: xxxxxxxx…)" with a copy-to-clipboard control when no
 *    director relation exists (only the created_by UUID is known).
 */
export function DirectorCell({ director, fallbackId }: DirectorCellProps) {
  const userId = director?.user_id ?? fallbackId;
  const nombre = director?.nombre?.trim() || null;
  const club = director?.club?.trim() || null;

  if (nombre && club) {
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{nombre}</span>
        <span className="text-sm text-muted-foreground">{club}</span>
      </div>
    );
  }

  if (nombre) {
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{nombre}</span>
        <span className="text-sm text-muted-foreground">—</span>
      </div>
    );
  }

  const trimmedId = userId.slice(0, 8);

  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-foreground">
        Director (id: {trimmedId}…)
      </span>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span className="font-mono text-xs">{userId}</span>
        <CopyButton
          text={userId}
          ariaLabel="Copiar ID del director"
        />
      </div>
    </div>
  );
}
