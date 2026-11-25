import { describe, expect, it } from "vitest";
import { checkHonorAsset, readUploadedUrl } from "./assets";

describe("checkHonorAsset", () => {
  it("accepts PNG, JPEG and WebP images up to 5 MB", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      expect(checkHonorAsset("image", { type, size: 5 * 1024 * 1024 })).toBeNull();
    }
  });

  it("rejects SVG and PDF as image", () => {
    expect(checkHonorAsset("image", { type: "image/svg+xml", size: 10 })).toEqual({ kind: "type" });
    expect(checkHonorAsset("image", { type: "application/pdf", size: 10 })).toEqual({ kind: "type" });
  });

  it("rejects images above 5 MB and PDFs above 10 MB", () => {
    expect(checkHonorAsset("image", { type: "image/png", size: 5 * 1024 * 1024 + 1 })).toEqual({
      kind: "size",
      maxMb: 5,
    });
    expect(
      checkHonorAsset("material", { type: "application/pdf", size: 10 * 1024 * 1024 + 1 }),
    ).toEqual({ kind: "size", maxMb: 10 });
  });

  it("accepts only PDF as material", () => {
    expect(checkHonorAsset("material", { type: "application/pdf", size: 10 })).toBeNull();
    expect(checkHonorAsset("material", { type: "image/png", size: 10 })).toEqual({ kind: "type" });
  });
});

describe("readUploadedUrl", () => {
  it("reads the URL from the API envelope or a bare object", () => {
    expect(readUploadedUrl({ status: "success", data: { url: "https://r2/a.png" } })).toBe(
      "https://r2/a.png",
    );
    expect(readUploadedUrl({ url: "https://r2/b.pdf" })).toBe("https://r2/b.pdf");
  });

  it("returns null for anything else", () => {
    expect(readUploadedUrl(null)).toBeNull();
    expect(readUploadedUrl({ data: { url: "" } })).toBeNull();
    expect(readUploadedUrl("https://r2/a.png")).toBeNull();
  });
});
