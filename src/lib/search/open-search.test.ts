import { describe, expect, it, vi } from "vitest";
import { openGlobalSearch, OPEN_SEARCH_EVENT } from "./open-search";

describe("openGlobalSearch", () => {
  it("dispatches sacdia:open-search on window", () => {
    const listener = vi.fn();
    window.addEventListener("sacdia:open-search", listener);
    openGlobalSearch();
    window.removeEventListener("sacdia:open-search", listener);
    expect(OPEN_SEARCH_EVENT).toBe("sacdia:open-search");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
