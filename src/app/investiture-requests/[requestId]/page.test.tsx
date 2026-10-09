import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

import InvestitureRequestLinkPage from "./page";

describe("InvestitureRequestLinkPage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("redirects the mail link to the dashboard detail", async () => {
    await expect(
      InvestitureRequestLinkPage({ params: Promise.resolve({ requestId: "req-1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/investiture-requests/req-1");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/investiture-requests/req-1");
  });

  it("encodes the request id", async () => {
    await expect(
      InvestitureRequestLinkPage({ params: Promise.resolve({ requestId: "a b/c" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/investiture-requests/a%20b%2Fc");
  });
});
