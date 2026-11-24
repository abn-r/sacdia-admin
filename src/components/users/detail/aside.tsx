import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface UserDetailAsideFact {
  label: string;
  value: ReactNode;
  /** Dim the value (missing / not applicable). */
  muted?: boolean;
}

interface UserDetailAsideProps {
  facts: UserDetailAsideFact[];
  /** Actions block, fixed under the facts. */
  actions?: ReactNode;
}

/**
 * Content of the detail-B aside: what is consulted from any tab (state,
 * club, access, post-registration) and the actions. Identity lives in the
 * page header, so nothing here repeats it.
 */
export function UserDetailAside({ facts, actions }: UserDetailAsideProps) {
  return (
    <>
      <dl className="space-y-2.5 text-sm">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-3"
          >
            <dt className="text-muted-foreground text-xs">{fact.label}</dt>
            <dd
              className={cn(
                "min-w-0 break-words font-medium",
                fact.muted ? "font-normal text-muted-foreground" : "text-foreground",
              )}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      {actions ? <div className="border-t pt-4">{actions}</div> : null}
    </>
  );
}
