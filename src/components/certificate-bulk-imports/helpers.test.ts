import { describe, expect, it } from "vitest";
import type { CertificateBulkImportFile } from "@/lib/api/certificate-bulk-imports";
import { resolveProofTarget } from "@/components/certificate-bulk-imports/helpers";

function file(file_id: string, page_count?: number | null): CertificateBulkImportFile {
  return {
    file_id,
    batch_id: "b",
    file_url: "",
    file_name: `${file_id}.pdf`,
    file_type: "application/pdf",
    uploaded_at: "2026-10-01T00:00:00Z",
    page_count,
  };
}

describe("resolveProofTarget", () => {
  const files = [file("a", 3), file("b", 5), file("c", null), file("d")];

  it("returns null without files", () => {
    expect(resolveProofTarget({ source_file_id: "a", source_page: 2 }, [])).toBeNull();
  });

  it("opens the source file at the source page", () => {
    expect(resolveProofTarget({ source_file_id: "b", source_page: 4 }, files)).toEqual({ fileId: "b", page: 4 });
  });

  it("falls back to the first file on page 1 when source_file_id is missing or unknown", () => {
    expect(resolveProofTarget({ source_file_id: null, source_page: 3 }, files)).toEqual({ fileId: "a", page: 1 });
    expect(resolveProofTarget({}, files)).toEqual({ fileId: "a", page: 1 });
    expect(resolveProofTarget({ source_file_id: "gone", source_page: 3 }, files)).toEqual({ fileId: "a", page: 1 });
  });

  it("uses page 1 for a missing or inconsistent page", () => {
    expect(resolveProofTarget({ source_file_id: "a", source_page: null }, files)?.page).toBe(1);
    expect(resolveProofTarget({ source_file_id: "a", source_page: 0 }, files)?.page).toBe(1);
    expect(resolveProofTarget({ source_file_id: "a", source_page: 4 }, files)?.page).toBe(1);
    expect(resolveProofTarget({ source_file_id: "a", source_page: 1.5 }, files)?.page).toBe(1);
  });

  it("accepts any page >= 1 when page_count is unknown", () => {
    expect(resolveProofTarget({ source_file_id: "c", source_page: 7 }, files)).toEqual({ fileId: "c", page: 7 });
    expect(resolveProofTarget({ source_file_id: "d", source_page: 2 }, files)).toEqual({ fileId: "d", page: 2 });
  });
});
