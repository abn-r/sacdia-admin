import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PdfInlineViewer, buildPdfViewerUrl } from "@/components/shared/pdf-inline-viewer";

const BLOB = "blob:http://localhost/pdf-1";
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ({
    ok: true,
    // jsdom's Blob lacks arrayBuffer(); a PDF-typed stub keeps the viewer on the happy path.
    blob: async () => ({ size: 8, type: "application/pdf" }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => BLOB);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("buildPdfViewerUrl", () => {
  it("appends the #page open parameter for a valid page", () => {
    expect(buildPdfViewerUrl(BLOB, 1)).toBe(`${BLOB}#page=1`);
    expect(buildPdfViewerUrl(BLOB, 3)).toBe(`${BLOB}#page=3`);
  });

  it.each([[undefined], [0], [-2], [1.5], [Number.NaN]])("leaves the URL alone for %s", (page) => {
    expect(buildPdfViewerUrl(BLOB, page)).toBe(BLOB);
  });
});

describe("PdfInlineViewer", () => {
  it("renders a plain iframe, not an <object>, on the requested page", async () => {
    const { container } = render(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={3} />);
    const viewer = await screen.findByTestId("pdf-inline-viewer");
    expect(viewer.tagName).toBe("IFRAME");
    expect(viewer.getAttribute("src")).toBe(`${BLOB}#page=3`);
    expect(viewer.getAttribute("title")).toBe("a");
    expect(container.querySelector("object, embed")).toBeNull();
    // No nested fallback frame: the PDF must be loaded once, not twice.
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
  });

  it.each([[undefined], [0], [-2], [1.5]])("leaves the URL alone for initialPage=%s", async (page) => {
    render(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={page} />);
    const viewer = await screen.findByTestId("pdf-inline-viewer");
    expect(viewer.getAttribute("src")).toBe(BLOB);
  });

  it("remounts the frame when the page changes, without refetching the PDF", async () => {
    const view = render(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={1} navigationKey={0} />);
    const first = await screen.findByTestId("pdf-inline-viewer");
    expect(first.getAttribute("src")).toBe(`${BLOB}#page=1`);

    view.rerender(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={2} navigationKey={1} />);

    const second = screen.getByTestId("pdf-inline-viewer");
    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
    expect(second.getAttribute("src")).toBe(`${BLOB}#page=2`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("remounts on the same page when only navigationKey changes", async () => {
    const view = render(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={2} navigationKey={1} />);
    const first = await screen.findByTestId("pdf-inline-viewer");

    view.rerender(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={2} navigationKey={2} />);

    const second = screen.getByTestId("pdf-inline-viewer");
    expect(second).not.toBe(first);
    expect(second.getAttribute("src")).toBe(`${BLOB}#page=2`);
  });

  it("keeps the same frame when nothing about the target changes", async () => {
    const view = render(<PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={2} navigationKey={1} />);
    const first = await screen.findByTestId("pdf-inline-viewer");

    view.rerender(
      <PdfInlineViewer src="https://r2.test/a.pdf" title="a" initialPage={2} navigationKey={1} className="h-10" />,
    );

    expect(screen.getByTestId("pdf-inline-viewer")).toBe(first);
  });
});
