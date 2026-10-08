import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Loading from "./loading";

// DataTableShell observes its scroll container.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("InvestitureRequestDetailLoading", () => {
  afterEach(() => cleanup());

  it("renders skeleton placeholders without crashing", () => {
    const { container } = render(<Loading />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(3);
  });

  it("announces itself as busy to assistive technology", () => {
    const { container } = render(<Loading />);

    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
  });
});
