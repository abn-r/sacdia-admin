import { describe, it, expect } from "vitest";
import {
  parseTranslations,
  buildTranslatableCreate,
  buildTranslatableUpdate,
} from "./helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

// ─── parseTranslations — default fields ['name', 'description'] ───────────────

describe("parseTranslations() — default fields", () => {
  it("parses a single entry with locale + name", () => {
    const fd = makeFormData({
      "translations[0][locale]": "en",
      "translations[0][name]": "Mexico",
    });
    const result = parseTranslations(fd);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ locale: "en", name: "Mexico" });
  });

  it("parses name + description in the same entry", () => {
    const fd = makeFormData({
      "translations[0][locale]": "pt-BR",
      "translations[0][name]": "Alergia",
      "translations[0][description]": "Descripción pt-BR",
    });
    const result = parseTranslations(fd);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Descripción pt-BR");
  });

  it("skips an entry where all translatable fields are empty", () => {
    const fd = makeFormData({
      "translations[0][locale]": "en",
      "translations[0][name]": "",
      "translations[0][description]": "",
    });
    const result = parseTranslations(fd);
    expect(result).toHaveLength(0);
  });

  it("skips an entry whose locale is not in CATALOG_LOCALES", () => {
    const fd = makeFormData({
      "translations[0][locale]": "es", // es is the base language — excluded
      "translations[0][name]": "Nombre ES",
    });
    const result = parseTranslations(fd);
    expect(result).toHaveLength(0);
  });

  it("parses multiple locale entries in index order", () => {
    const fd = makeFormData({
      "translations[0][locale]": "en",
      "translations[0][name]": "Name EN",
      "translations[1][locale]": "pt-BR",
      "translations[1][name]": "Nome PT",
    });
    const result = parseTranslations(fd);
    expect(result).toHaveLength(2);
    expect(result[0].locale).toBe("en");
    expect(result[1].locale).toBe("pt-BR");
  });
});

// ─── parseTranslations — override fields ['name', 'ideal'] ───────────────────

describe("parseTranslations() — override fields ['name', 'ideal']", () => {
  it("extracts the ideal field when configured", () => {
    const fd = makeFormData({
      "translations[0][locale]": "en",
      "translations[0][name]": "Service",
      "translations[0][ideal]": "We serve others",
    });
    const result = parseTranslations(fd, ["name", "ideal"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ locale: "en", name: "Service", ideal: "We serve others" });
  });

  it("does NOT include description even if present in FormData when fields=['name','ideal']", () => {
    const fd = makeFormData({
      "translations[0][locale]": "pt-BR",
      "translations[0][name]": "Serviço",
      "translations[0][description]": "should be ignored",
      "translations[0][ideal]": "Servimos",
    });
    const result = parseTranslations(fd, ["name", "ideal"]);
    expect(result[0]).not.toHaveProperty("description");
    expect(result[0]).toHaveProperty("ideal", "Servimos");
  });

  it("skips entry when ideal-only entry has empty ideal", () => {
    const fd = makeFormData({
      "translations[0][locale]": "fr",
      "translations[0][ideal]": "",
    });
    const result = parseTranslations(fd, ["name", "ideal"]);
    expect(result).toHaveLength(0);
  });
});

// ─── buildTranslatableCreate ──────────────────────────────────────────────────

describe("buildTranslatableCreate()", () => {
  it("builds a payload with name + description when both are present (default fields)", () => {
    const fd = makeFormData({ name: "Alergia", description: "Reacción" });
    const result = buildTranslatableCreate(fd);
    expect(result.name).toBe("Alergia");
    expect(result.description).toBe("Reacción");
    expect(result.active).toBe(true);
  });

  it("builds a payload with name + ideal for club-ideals override", () => {
    const fd = makeFormData({ name: "Servicio", ideal: "Servimos a los demás" });
    const result = buildTranslatableCreate(fd, ["name", "ideal"]);
    expect(result.name).toBe("Servicio");
    expect(result.ideal).toBe("Servimos a los demás");
    expect(result).not.toHaveProperty("description");
  });

  it("throws when name is empty", () => {
    const fd = makeFormData({ name: "" });
    expect(() => buildTranslatableCreate(fd)).toThrow("El nombre es obligatorio.");
  });

  it("includes translations when present and fields=['name','ideal']", () => {
    const fd = makeFormData({
      name: "Servicio",
      "translations[0][locale]": "en",
      "translations[0][name]": "Service",
      "translations[0][ideal]": "We serve",
    });
    const result = buildTranslatableCreate(fd, ["name", "ideal"]);
    const translations = result.translations as Array<Record<string, string>>;
    expect(translations).toHaveLength(1);
    expect(translations[0]).toMatchObject({ locale: "en", ideal: "We serve" });
    expect(translations[0]).not.toHaveProperty("description");
  });
});

// ─── buildTranslatableUpdate ──────────────────────────────────────────────────

describe("buildTranslatableUpdate()", () => {
  it("does not include translations when dirty flag is absent", () => {
    const fd = makeFormData({ name: "Updated" });
    const result = buildTranslatableUpdate(fd);
    expect(result).not.toHaveProperty("translations");
  });

  it("includes translations when dirty flag is '1' and fields=['name','ideal']", () => {
    const fd = makeFormData({
      name: "Servicio",
      translations_dirty: "1",
      "translations[0][locale]": "pt-BR",
      "translations[0][ideal]": "Servimos",
    });
    const result = buildTranslatableUpdate(fd, ["name", "ideal"]);
    const translations = result.translations as Array<Record<string, string>>;
    expect(translations).toHaveLength(1);
    expect(translations[0].ideal).toBe("Servimos");
    expect(result).not.toHaveProperty("description");
  });

  it("emits description='' for default fields when description is absent", () => {
    const fd = makeFormData({ name: "Alergia" });
    const result = buildTranslatableUpdate(fd);
    // description field should be reset to empty string (clear intent)
    expect(result.description).toBe("");
  });
});
