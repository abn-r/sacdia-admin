import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResolvedIndexSection } from "@/navigation/sidebar/index-pages-resolve";

export type LinkIndexCopy = Readonly<Record<string, { title?: string; description?: string }>>;

/**
 * Compact link index used by hub pages (catalogs, configuration). Presentation
 * only: the caller filters links by access before passing them in.
 * `copy` overrides title/description for a link id.
 */
export function LinkIndexSections({
  sections,
  copy = {},
}: {
  sections: readonly ResolvedIndexSection[];
  copy?: LinkIndexCopy;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`index-section-${section.id}`} className="space-y-3">
          <h2 id={`index-section-${section.id}`} className="text-sm font-semibold tracking-tight">
            {section.title}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.links.map((link) => {
              const override = copy[link.id];
              const title = override?.title ?? link.title;
              return (
                <Link
                  key={link.id}
                  href={link.url}
                  className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <link.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        {title}
                      </CardTitle>
                      {override?.description ? (
                        <CardDescription className="text-xs">{override.description}</CardDescription>
                      ) : null}
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
