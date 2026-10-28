import { describe, expect, it } from "vitest";

import enMessages from "../../../messages/en.json";
import esMessages from "../../../messages/es.json";
import frMessages from "../../../messages/fr.json";
import ptBRMessages from "../../../messages/pt-BR.json";
import { filterSidebarItems } from "./filter-sidebar";
import {
  NAV_SECTION_KEY_BY_GROUP_ID,
  localizeSidebarItems,
  sidebarGroupMessageKey,
  sidebarItemMessageKey,
} from "./sidebar-i18n";
import { sidebarItems, type NavGroup, type NavSubItem } from "./sidebar-items";

type Messages = { nav: Record<string, unknown> };

const locales: Array<[string, Messages]> = [
  ["es", esMessages as unknown as Messages],
  ["en", enMessages as unknown as Messages],
  ["fr", frMessages as unknown as Messages],
  ["pt-BR", ptBRMessages as unknown as Messages],
];

function makeTranslator(messages: Messages) {
  const lookup = (key: string): unknown =>
    key
      .split(".")
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined,
        messages.nav,
      );
  const t = ((key: string) => String(lookup(key))) as ((key: string) => string) & {
    has: (key: string) => boolean;
  };
  t.has = (key: string) => typeof lookup(key) === "string";
  return t;
}

function collectIds(groups: NavGroup[]): string[] {
  const ids: string[] = [];
  const walkSub = (sub: NavSubItem) => {
    ids.push(sub.id);
    sub.subItems?.forEach(walkSub);
  };
  for (const group of groups) {
    for (const item of group.items) {
      ids.push(item.id);
      if ("subItems" in item) item.subItems?.forEach(walkSub);
    }
  }
  return ids;
}

describe("sidebar localisation", () => {
  it.each(locales)("%s defines a message for every sidebar item and label", (_l, messages) => {
    const t = makeTranslator(messages);
    const missing = collectIds(sidebarItems).filter((id) => !t.has(sidebarItemMessageKey(id)));
    expect(missing).toEqual([]);

    const missingSections = sidebarItems
      .filter((group) => group.label)
      .filter((group) => {
        const key = sidebarGroupMessageKey(group.id);
        return !key || !t.has(key);
      })
      .map((group) => group.id);
    expect(missingSections).toEqual([]);
  });

  it.each(locales)(
    "%s keeps group-parent titles identical to their section label (command palette grouping)",
    (_l, messages) => {
      const localized = localizeSidebarItems(sidebarItems, makeTranslator(messages));
      for (const [groupId, itemId] of [
        [5, "campamentos"],
        [6, "materials"],
      ] as const) {
        const group = localized.find((g) => g.id === groupId)!;
        const item = group.items.find((i) => i.id === itemId)!;
        expect(item.title).toBe(group.label);
      }
    },
  );

  it("maps every labelled group to a section", () => {
    for (const group of sidebarItems.filter((g) => g.label)) {
      expect(NAV_SECTION_KEY_BY_GROUP_ID[group.id]).toBeDefined();
    }
  });

  it("renders titles and labels in the active locale without touching ids/urls", () => {
    const en = localizeSidebarItems(sidebarItems, makeTranslator(locales[1]![1]));
    const flat = (groups: NavGroup[]) =>
      groups.flatMap((g) => g.items.flatMap((i) => [i, ...("subItems" in i ? (i.subItems ?? []) : [])]));

    const original = flat(sidebarItems);
    const localized = flat(en);
    expect(localized.map((i) => i.id)).toEqual(original.map((i) => i.id));
    expect(localized.map((i) => ("url" in i ? i.url : undefined))).toEqual(
      original.map((i) => ("url" in i ? i.url : undefined)),
    );

    expect(en[0]!.items[0]!.title).toBe("Home");
    expect(en[1]!.label).toBe("Club management");
    expect(localized.find((i) => i.id === "users")!.title).toBe("Users");
    expect(localized.find((i) => i.id === "requests-transfers")!.title).toBe("Transfers");
  });

  it("localises after permission filtering (filter keys on ids, not titles)", () => {
    const filtered = filterSidebarItems(sidebarItems, {
      isSuperAdmin: true,
      canAny: () => false,
      canAll: () => false,
      hasAnyRole: () => false,
    });
    const fr = localizeSidebarItems(filtered, makeTranslator(locales[2]![1]));
    expect(fr).toHaveLength(filtered.length);
    expect(fr[0]!.items[0]!.title).toBe("Accueil");
  });
});
