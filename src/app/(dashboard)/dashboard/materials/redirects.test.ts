import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import CategoriesRedirect from "./categories/page";
import InventoryRedirect from "./inventory/page";
import ReceiptsRedirect from "./receipts/page";
import ReceiptDetailRedirect from "./receipts/[folio]/page";

async function target(run: () => unknown): Promise<string> {
  try {
    await run();
  } catch (error) {
    return (error as Error).message.replace("NEXT_REDIRECT:", "");
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  redirect.mockClear();
});

describe("Materiales legacy routes", () => {
  it("Comprobantes is a tab of the one queue", async () => {
    expect(await target(() => ReceiptsRedirect({ searchParams: Promise.resolve({}) }))).toBe(
      "/dashboard/materials/inbox?tab=receipts",
    );
    expect(await target(() => ReceiptsRedirect({ searchParams: Promise.resolve({ q: "SOL2026" }) }))).toBe(
      "/dashboard/materials/inbox?tab=receipts&q=SOL2026",
    );
  });

  it("a receipt detail opens the order detail, where it is reviewed", async () => {
    expect(await target(() => ReceiptDetailRedirect({ params: Promise.resolve({ folio: "SOL20260011" }) }))).toBe(
      "/dashboard/materials/request/SOL20260011",
    );
  });

  it("Inventario and Categorías join Catálogo", async () => {
    expect(await target(() => InventoryRedirect({ searchParams: Promise.resolve({}) }))).toBe(
      "/dashboard/materials/catalog",
    );
    expect(
      await target(() => InventoryRedirect({ searchParams: Promise.resolve({ q: "pañoleta", cat: "uniforme" }) })),
    ).toBe("/dashboard/materials/catalog?q=pa%C3%B1oleta&cat=uniforme");
    expect(await target(() => CategoriesRedirect())).toBe("/dashboard/materials/catalog?tab=categories");
  });
});
