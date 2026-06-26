import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { DataTableShell } from "@/components/shared/data-table-shell";

/**
 * Tests for DataTableShell:
 * - default render with children
 * - data-scrolled-* attrs reflect scroll position
 * - mask-image style applied when overflowing and not at both ends
 *
 * Uses a manual ResizeObserver stub that captures the callback so we can
 * drive layout updates in tests without relying on real layout.
 */

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;
let resizeCallbacks: ResizeCallback[] = [];

class StubResizeObserver {
  callback: ResizeCallback;
  constructor(callback: ResizeCallback) {
    this.callback = callback;
    resizeCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    resizeCallbacks = resizeCallbacks.filter((cb) => cb !== this.callback);
  }
}

beforeEach(() => {
  resizeCallbacks = [];
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function triggerResize() {
  act(() => {
    for (const cb of resizeCallbacks) {
      cb([] as unknown as ResizeObserverEntry[]);
    }
  });
}

function setScrollMetrics(
  el: HTMLElement,
  { scrollWidth, clientWidth, scrollLeft }: { scrollWidth: number; clientWidth: number; scrollLeft: number },
) {
  Object.defineProperty(el, "scrollWidth", { value: scrollWidth, configurable: true });
  Object.defineProperty(el, "clientWidth", { value: clientWidth, configurable: true });
  Object.defineProperty(el, "scrollLeft", { value: scrollLeft, configurable: true, writable: true });
}

describe("DataTableShell", () => {
  it("renders children inside scroll container", () => {
    const { container, getByText } = render(
      <DataTableShell>
        <table>
          <tbody>
            <tr>
              <td>cell-content</td>
            </tr>
          </tbody>
        </table>
      </DataTableShell>,
    );

    expect(getByText("cell-content")).toBeInTheDocument();
    const shell = container.firstChild as HTMLElement;
    expect(shell).toHaveClass("overflow-x-auto");
  });

  it("reports both ends reached when content does not overflow", () => {
    const { container } = render(
      <DataTableShell>
        <div>no overflow</div>
      </DataTableShell>,
    );

    const shell = container.firstChild as HTMLElement;
    setScrollMetrics(shell, { scrollWidth: 100, clientWidth: 100, scrollLeft: 0 });
    triggerResize();

    expect(shell.dataset.scrolledStart).toBe("true");
    expect(shell.dataset.scrolledEnd).toBe("true");
    expect(shell.style.maskImage).toBe("");
  });

  it("hides mask when content overflows but user is at end", () => {
    const { container } = render(
      <DataTableShell>
        <div>overflowing</div>
      </DataTableShell>,
    );

    const shell = container.firstChild as HTMLElement;
    setScrollMetrics(shell, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 600 });
    triggerResize();

    expect(shell.dataset.scrolledStart).toBe("false");
    expect(shell.dataset.scrolledEnd).toBe("true");
    expect(shell.style.maskImage).toContain("linear-gradient");
    expect(shell.style.maskImage).toContain("transparent");
  });

  it("applies trailing mask when overflowing and scrolled to start", () => {
    const { container } = render(
      <DataTableShell>
        <div>overflowing</div>
      </DataTableShell>,
    );

    const shell = container.firstChild as HTMLElement;
    setScrollMetrics(shell, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 0 });
    triggerResize();

    expect(shell.dataset.scrolledStart).toBe("true");
    expect(shell.dataset.scrolledEnd).toBe("false");
    expect(shell.style.maskImage).toContain("linear-gradient");
  });

  it("applies both-side mask when scrolled in the middle", () => {
    const { container } = render(
      <DataTableShell>
        <div>overflowing</div>
      </DataTableShell>,
    );

    const shell = container.firstChild as HTMLElement;
    setScrollMetrics(shell, { scrollWidth: 1000, clientWidth: 400, scrollLeft: 200 });
    triggerResize();

    expect(shell.dataset.scrolledStart).toBe("false");
    expect(shell.dataset.scrolledEnd).toBe("false");
    expect(shell.style.maskImage).toContain("linear-gradient");
  });

  it("merges custom className with defaults", () => {
    const { container } = render(
      <DataTableShell className="custom-cls">
        <div>x</div>
      </DataTableShell>,
    );
    const shell = container.firstChild as HTMLElement;
    expect(shell).toHaveClass("custom-cls");
    expect(shell).toHaveClass("rounded-xl");
  });
});
