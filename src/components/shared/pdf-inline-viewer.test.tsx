import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PdfInlineViewer } from "@/components/shared/pdf-inline-viewer";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    // jsdom's Blob lacks arrayBuffer(); a PDF-typed stub keeps the viewer on the happy path.
    vi.fn(async () => ({ ok: true, blob: async () => ({ size: 8, type: "application/pdf" }) })),
  );
  URL.createObjectURL = vi.fn(() => "blob:http://localhost/pdf-1");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PdfInlineViewer initialPage", () => {
  it("opens on the requested page through the #page fragment", async () => {
    render(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={3} />);
    const viewer = await screen.findByTestId("pdf-inline-viewer");
    expect(viewer.getAttribute("data")).toBe("blob:http://localhost/pdf-1#page=3");
  });

  it.each([[undefined], [0], [-2], [1.5]])("leaves the URL alone for %s", async (page) => {
    render(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={page} />);
    const viewer = await screen.findByTestId("pdf-inline-viewer");
    expect(viewer.getAttribute("data")).toBe("blob:http://localhost/pdf-1");
  });
});
