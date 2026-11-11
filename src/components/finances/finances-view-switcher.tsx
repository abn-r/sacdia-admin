import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface FinancesViewSwitcherProps {
  active: "by-club" | "overview";
}

/** «Por club / Consolidado» segmented navigation; only rendered for territorial roles. */
export function FinancesViewSwitcher({ active }: FinancesViewSwitcherProps) {
  const t = useTranslations("finances.views");
  const items = [
    { id: "by-club", href: "/dashboard/finances", label: t("byClub") },
    { id: "overview", href: "/dashboard/finances/overview", label: t("overview") },
  ] as const;

  return (
    <nav
      aria-label={t("label")}
      className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1"
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={active === item.id ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            active === item.id
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
