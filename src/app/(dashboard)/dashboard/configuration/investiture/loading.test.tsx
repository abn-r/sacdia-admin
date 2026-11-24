import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Loading from "./loading";

describe("InvestitureSettingsLoading", () => {
  afterEach(() => cleanup());

  it("renders skeleton placeholders and announces itself as busy", () => {
    const { container } = render(<Loading />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(5);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
  });
});
