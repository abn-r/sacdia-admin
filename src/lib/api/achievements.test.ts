import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ fromClient: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn(),
  apiRequestFromClient: client.fromClient,
}));

import { uploadAchievementImage } from "./achievements";

describe("uploadAchievementImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts the file and reads the URL from the API envelope", async () => {
    client.fromClient.mockResolvedValueOnce({
      status: "success",
      data: {
        badge_image_key: "achievements/badges/7_gold.png",
        badge_image_url: "https://r2.example/achievements/badges/7_gold.png",
      },
    });
    const file = new File(["png"], "insignia.png", { type: "image/png" });

    const result = await uploadAchievementImage(7, file);

    expect(result).toEqual({
      badge_image_key: "achievements/badges/7_gold.png",
      badge_image_url: "https://r2.example/achievements/badges/7_gold.png",
    });
    const [path, options] = client.fromClient.mock.calls[0];
    expect(path).toBe("/admin/achievements/7/image");
    expect(options.method).toBe("POST");
    expect((options.body as FormData).get("file")).toBe(file);
  });

  it("still accepts an unwrapped body", async () => {
    client.fromClient.mockResolvedValueOnce({
      badge_image_key: "k",
      badge_image_url: "https://r2.example/k.png",
    });
    await expect(
      uploadAchievementImage(1, new File(["x"], "a.png", { type: "image/png" })),
    ).resolves.toEqual({ badge_image_key: "k", badge_image_url: "https://r2.example/k.png" });
  });

  it("fails instead of returning an empty URL", async () => {
    client.fromClient.mockResolvedValueOnce({ status: "success", data: {} });
    await expect(
      uploadAchievementImage(1, new File(["x"], "a.png", { type: "image/png" })),
    ).rejects.toThrow("without an image URL");
  });
});
