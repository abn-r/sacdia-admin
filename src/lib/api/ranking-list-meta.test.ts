import { describe, expect, it } from "vitest";

import { normalizeRankingListMeta } from "@/lib/api/ranking-list-meta";

describe("normalizeRankingListMeta", () => {
  it("reads the pagination the ranking endpoints send at the root", () => {
    // Real shape of GET /section-rankings and GET /member-rankings.
    expect(
      normalizeRankingListMeta({ data: [{}, {}], total: 2, page: 1, limit: 20 }),
    ).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
  });

  it("still prefers a nested meta object", () => {
    expect(
      normalizeRankingListMeta({
        data: { data: [], meta: { total: 45, page: 2, limit: 20, totalPages: 3 } },
      }),
    ).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 });
    expect(normalizeRankingListMeta({ data: [], meta: { total: 5, page: 1, limit: 2 } })).toEqual({
      total: 5,
      page: 1,
      limit: 2,
      totalPages: 3,
    });
  });

  it("falls back to an empty first page when nothing carries a total", () => {
    expect(normalizeRankingListMeta({ data: [] })).toEqual({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(normalizeRankingListMeta(null)).toEqual({ total: 0, page: 1, limit: 20, totalPages: 1 });
  });
});
