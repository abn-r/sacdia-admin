import Link from "next/link";

export type OperationsSecondaryStat = {
  id: string;
  label: string;
  value: string;
  href?: string;
};

export interface OperationsSecondaryStatsProps {
  label: string;
  items: OperationsSecondaryStat[];
}

/** Small muted strip for period figures that do not need their own card. */
export function OperationsSecondaryStats({ label, items }: OperationsSecondaryStatsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-label={label}>
      <ul className="flex flex-wrap gap-x-6 gap-y-1.5 text-muted-foreground text-xs">
        {items.map((item) => {
          const content = (
            <>
              {item.label}
              <span className="ml-1.5 font-medium text-foreground tabular-nums">{item.value}</span>
            </>
          );
          return (
            <li key={item.id}>
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
