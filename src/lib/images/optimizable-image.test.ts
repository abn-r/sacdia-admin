import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OPTIMIZABLE_IMAGE_HOSTS,
  shouldOptimizeImage,
} from "./optimizable-image";

const PUB = "https://pub-c8aa231ae66c46ff96fc5e811994d9d2.r2.dev";

describe("shouldOptimizeImage", () => {
  it("optimizes public R2 images", () => {
    expect(shouldOptimizeImage(`${PUB}/honors/aventureros/abc.png`)).toBe(true);
  });

  it("optimizes same-origin static assets", () => {
    expect(shouldOptimizeImage("/img/logos-clases/AV-01.png")).toBe(true);
  });

  it.each([
    ["blob", "blob:http://localhost:3001/1234"],
    ["data", "data:image/png;base64,AAAA"],
    ["empty", "   "],
    ["svg (remote)", `${PUB}/icons/x.svg`],
    ["svg (local)", "/brand/iasd-symbol.svg"],
    ["unknown host", "https://example.com/a.png"],
    ["plain http", "http://pub-c8aa231ae66c46ff96fc5e811994d9d2.r2.dev/a.png"],
    ["protocol-relative", "//example.com/a.png"],
    ["garbage", "not a url"],
    [
      "private R2 endpoint",
      "https://5da196c051c48c7a4ebeea275a2b23d1.r2.cloudflarestorage.com/b/k.png",
    ],
  ])("serves %s as-is", (_label, src) => {
    expect(shouldOptimizeImage(src)).toBe(false);
  });

  it("serves presigned URLs as-is even on an allowed host", () => {
    expect(
      shouldOptimizeImage(`${PUB}/a.png?X-Amz-Signature=abc&X-Amz-Expires=300`),
    ).toBe(false);
  });
});

describe("OPTIMIZABLE_IMAGE_HOSTS", () => {
  it("stays in sync with images.remotePatterns in next.config.ts", () => {
    const config = readFileSync(resolve(__dirname, "../../../next.config.ts"), "utf8");
    for (const host of OPTIMIZABLE_IMAGE_HOSTS) {
      expect(config).toContain(`hostname: "${host}"`);
    }
  });
});
