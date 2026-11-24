import { describe, expect, it } from "vitest";
import {
  describeScope,
  externalHost,
  fileExtension,
  formatFileSize,
  toResourceType,
  toScopeLevel,
} from "@/components/resources/resource-meta";

const unions = [{ union_id: 20, name: "Unión Mexicana Interoceánica", country_id: 1 }];
const localFields = [{ local_field_id: 4, name: "Asociación Valle Alto", union_id: 20 }];

describe("resource-meta", () => {
  it("describes the territory and the level of a row", () => {
    expect(describeScope({ scope_level: "union", scope_id: 20 }, unions, localFields)).toEqual({
      level: "union",
      name: "Unión Mexicana Interoceánica",
      id: 20,
    });
    expect(describeScope({ scope_level: "local_field", scope_id: 4 }, unions, localFields)?.name).toBe(
      "Asociación Valle Alto",
    );
  });

  it("keeps the id when the catalogs do not know the territory", () => {
    expect(describeScope({ scope_level: "union", scope_id: 99 }, unions, localFields)).toEqual({
      level: "union",
      name: null,
      id: 99,
    });
  });

  it("returns null for a row without a valid level", () => {
    expect(describeScope({ scope_level: "galaxy" }, unions, localFields)).toBeNull();
    expect(describeScope({}, unions, localFields)).toBeNull();
  });

  it("derives the extension, host and size shown under the title", () => {
    expect(fileExtension("https://cdn.example.org/a/cuadernillo-amigo.pdf?sig=1")).toBe("PDF");
    expect(fileExtension("sin-extension")).toBeNull();
    expect(externalHost("https://www.youtube.com/watch?v=abc")).toBe("youtube.com");
    expect(externalHost("not a url")).toBeNull();
    expect(formatFileSize(13.2 * 1024 * 1024)).toBe("13.2 MB");
    expect(formatFileSize(840 * 1024)).toBe("840.0 KB");
    expect(formatFileSize(null)).toBe("");
  });

  it("narrows unknown values to known types and levels", () => {
    expect(toResourceType("video_link")).toBe("video_link");
    expect(toResourceType("pdf")).toBeNull();
    expect(toScopeLevel("local_field")).toBe("local_field");
    expect(toScopeLevel("country")).toBeNull();
  });
});
