import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const resourceUploadSources = [
  "src/components/resources/resources-crud-page.tsx",
  "src/lib/resources/resource-actions.ts",
  "src/lib/api/resources.ts",
].map((path) => join(process.cwd(), path));

describe("admin resource upload architecture", () => {
  it("does not upload files directly from the browser to R2", () => {
    const source = resourceUploadSources
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).not.toContain("requestUploadUrlAction");
    expect(source).not.toContain("XMLHttpRequest");
    expect(source).not.toContain("uploadToR2");
    expect(source).not.toContain("upload_url");
    expect(source).not.toContain("/resources/upload-url");
    expect(source).not.toContain("/resources/from-uploaded");
  });
});
