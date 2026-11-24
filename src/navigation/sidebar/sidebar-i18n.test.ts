import { describe, expect, it } from "vitest";

import enMessages from "../../../messages/en.json";
import esMessages from "../../../messages/es.json";
import frMessages from "../../../messages/fr.json";
import ptBRMessages from "../../../messages/pt-BR.json";
import { filterSidebarItems } from "./filter-sidebar";
import {
  NAV_SECTION_KEY_BY_GROUP_ID,
  localizeSidebarItems,
  navItemLabelKey,
  sidebarGroupMessageKey,
  sidebarItemMessageKey,
} from "./sidebar-i18n";
import { CATALOGS_INDEX_SECTIONS, CONFIGURATION_INDEX_SECTIONS } from "./index-pages";
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

function collectLabelKeys(groups: NavGroup[]): string[] {
  const keys: string[] = [];
  const walkSub = (sub: NavSubItem) => {
    keys.push(navItemLabelKey(sub));
    sub.subItems?.forEach(walkSub);
  };
  for (const group of groups) {
    for (const item of group.items) {
      keys.push(navItemLabelKey(item));
      if ("subItems" in item) item.subItems?.forEach(walkSub);
    }
  }
  return keys;
}

describe("sidebar localisation", () => {
  it.each(locales)("%s defines a message for every sidebar item and label", (_l, messages) => {
    const t = makeTranslator(messages);
    const missing = collectLabelKeys(sidebarItems).filter((key) => !t.has(key));
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
    "%s uses distinct group labels (command palette headings)",
    (_l, messages) => {
      const localized = localizeSidebarItems(sidebarItems, makeTranslator(messages));
      const labels = localized.flatMap((g) => (g.label ? [g.label] : []));
      expect(new Set(labels).size).toBe(labels.length);
    },
  );

  it.each(locales)(
    "%s resolves every index-page section and link title",
    (_l, messages) => {
      const t = makeTranslator(messages);
      for (const key of ["indexes.catalogsDescription", "indexes.configurationDescription"]) {
        expect(t.has(key), key).toBe(true);
      }
      const sections = [...CATALOGS_INDEX_SECTIONS, ...CONFIGURATION_INDEX_SECTIONS];
      for (const section of sections) {
        expect(t.has(`indexes.sections.${section.id}`), section.id).toBe(true);
        for (const link of section.links) {
          expect(t.has(sidebarItemMessageKey(link.id)), link.id).toBe(true);
        }
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
    expect(en[1]!.label).toBe("To review");
    expect(en[2]!.label).toBe("Clubs and members");
    expect(localized.find((i) => i.id === "users")!.title).toBe("Users");
    expect(localized.find((i) => i.id === "requests-transfers")!.title).toBe("Transfers");
  });

  it("localises after permission filtering (filter keys on ids, not titles)", () => {
    const filtered = filterSidebarItems(sidebarItems, {
      isSuperAdmin: true,
      permissions: new Set(),
      roles: new Set(),
      capabilities: new Set(),
    });
    const fr = localizeSidebarItems(filtered, makeTranslator(locales[2]![1]));
    expect(fr).toHaveLength(filtered.length);
    expect(fr[0]!.items[0]!.title).toBe("Accueil");
  });

  it("renders the approved Spanish labels for the redesigned sidebar", () => {
    const es = localizeSidebarItems(sidebarItems, makeTranslator(locales[0]![1]));
    const titles = (id: string) => {
      for (const group of es) {
        for (const item of group.items) {
          if (item.id === id) return [item.title, ..."subItems" in item ? (item.subItems ?? []).map((s) => s.title) : []];
        }
      }
      return undefined;
    };

    expect(titles("requests")).toEqual(["Solicitudes", "Traslados", "Asignaciones", "Membresía", "Registros anuales"]);
    expect(titles("validations-investitures")).toEqual(["Especialidades y clases"]);
    expect(titles("investiture-requests")).toEqual(["Investiduras"]);
    expect(titles("certificates")).toEqual([
      "Certificados",
      "Cargas por certificado",
      "Validación GM",
      "Certificaciones",
      "Constancias de consejería",
    ]);
    expect(titles("clubs-evidence-folders-list")).toEqual(["Carpetas de evidencias"]);
    expect(titles("finances")).toEqual(["Finanzas"]);
    expect(titles("club-inventory")).toEqual(["Inventario"]);
    expect(titles("annual-folders")).toEqual(["Progreso anual", "Clubes", "Configuración"]);
    expect(titles("section-rankings")).toEqual(["Progreso por sección"]);
    expect(titles("campamentos")?.slice(0, 3)).toEqual(["Camporees", "Campo local", "Unión"]);
    expect(titles("certifications-list")).toEqual(["Certificaciones"]);
    expect(titles("admin-system-roles")).toEqual(["Roles y permisos"]);
    expect(titles("admin-system-audit")).toEqual(["Auditoría"]);
    expect(titles("admin-system-jobs")).toEqual(["Sistema"]);
  });
});
