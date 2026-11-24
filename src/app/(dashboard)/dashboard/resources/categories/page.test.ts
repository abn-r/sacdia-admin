import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import ResourceCategoriesRedirect from "./page";

async function run(params: Record<string, string | string[] | undefined>) {
  try {
    await ResourceCategoriesRedirect({ searchParams: Promise.resolve(params) });
  } catch (error) {
    return (error as Error).message.replace("NEXT_REDIRECT:", "");
  }
  return null;
}

describe("/resources/categories", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("redirects to the categories tab", async () => {
    expect(await run({})).toBe("/dashboard/resources?tab=categories");
  });

  it("carries over the list params it used to read", async () => {
    const url = await run({ page: "2", search: "música", active: "false", other: "x" });
    expect(url).toBe("/dashboard/resources?tab=categories&page=2&search=m%C3%BAsica&active=false");
  });
});
