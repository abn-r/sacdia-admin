import { describe, expect, it } from "vitest";

import { isLegacyInsuranceBlocked, parsePaymentOrdersLocalFieldIds } from "./payment-orders-flag";

describe("payment orders flag", () => {
  it("parses the JSON list of local field ids and ignores garbage", () => {
    expect(parsePaymentOrdersLocalFieldIds("[4, 7]")).toEqual([4, 7]);
    expect(parsePaymentOrdersLocalFieldIds('["4", 7, null]')).toEqual([7]);
    expect(parsePaymentOrdersLocalFieldIds("{bad")).toEqual([]);
    expect(parsePaymentOrdersLocalFieldIds('{"a":1}')).toEqual([]);
    expect(parsePaymentOrdersLocalFieldIds(undefined)).toEqual([]);
  });

  it("blocks legacy registration only for listed local fields", () => {
    expect(isLegacyInsuranceBlocked(4, [4])).toBe(true);
    expect(isLegacyInsuranceBlocked(5, [4])).toBe(false);
    expect(isLegacyInsuranceBlocked(undefined, [4])).toBe(false);
  });
});
