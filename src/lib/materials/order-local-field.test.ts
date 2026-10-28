import { describe, expect, it } from "vitest";

import { orderLocalFieldId } from "@/lib/materials/order-local-field";

describe("orderLocalFieldId", () => {
  it("reads the nested local field the order detail returns", () => {
    expect(
      orderLocalFieldId({
        local_field: { local_field_id: 4, name: "ACV", abbreviation: "ACV" },
      } as never),
    ).toBe(4);
  });

  it("falls back to a top-level local_field_id", () => {
    expect(orderLocalFieldId({ local_field_id: 7 } as never)).toBe(7);
  });

  it("is undefined when the order carries neither", () => {
    expect(orderLocalFieldId({} as never)).toBeUndefined();
  });
});
