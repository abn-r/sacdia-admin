import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";

import type { IndexPageLink, IndexPageSection } from "./index-pages";
import { sidebarItemMessageKey } from "./sidebar-i18n";

export interface ResolvedIndexLink extends IndexPageLink {
  /** Localised destination title. */
  title: string;
}

export interface ResolvedIndexSection {
  id: string;
  title: string;
  links: ResolvedIndexLink[];
}

/**
 * Keeps the links the caller may open (same predicate the page gates use),
 * drops empty sections and localises titles. `t` is the `nav` namespace;
 * section titles live under `nav.indexes.sections.<id>`.
 */
export function resolveIndexSections(
  sections: readonly IndexPageSection[],
  canOpen: (link: IndexPageLink) => boolean,
  t: NavTranslator,
): ResolvedIndexSection[] {
  const resolved: ResolvedIndexSection[] = [];
  for (const section of sections) {
    const links = section.links
      .filter(canOpen)
      .map((link) => {
        const key = sidebarItemMessageKey(link.id);
        return { ...link, title: t.has(key) ? t(key) : link.title };
      });
    if (links.length === 0) continue;
    const sectionKey = `indexes.sections.${section.id}`;
    resolved.push({
      id: section.id,
      title: t.has(sectionKey) ? t(sectionKey) : section.title,
      links,
    });
  }
  return resolved;
}
