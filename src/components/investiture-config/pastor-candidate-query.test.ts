import { describe, expect, it } from "vitest";
import {
  CANDIDATE_QUERY_MAX,
  CANDIDATE_QUERY_MIN,
  CANDIDATE_TOKEN_MIN,
  canSearchPastorCandidates,
  normalizeCandidateQuery,
} from "./pastor-candidate-query";

describe("canSearchPastorCandidates", () => {
  it("mirrors the backend limits", () => {
    expect(CANDIDATE_QUERY_MIN).toBe(3);
    expect(CANDIDATE_TOKEN_MIN).toBe(2);
    expect(CANDIDATE_QUERY_MAX).toBe(100);
  });

  it.each([
    ["", false],
    ["  ", false],
    ["an", false],
    ["ana", true],
    ["  ana  ", true],
    ["a b", false],
    ["ana p", false],
    ["ana pe", true],
    ["ana   pe", true],
    ["al", false],
    ["al b", false],
    ["al bo", true],
    ["a@b", true],
  ])("%j -> %s", (query, expected) => {
    expect(canSearchPastorCandidates(query)).toBe(expected);
  });

  it("rejects queries longer than the backend accepts", () => {
    expect(canSearchPastorCandidates("a".repeat(101))).toBe(false);
    expect(canSearchPastorCandidates("a".repeat(100))).toBe(true);
  });
});

describe("normalizeCandidateQuery", () => {
  it("trims the query before sending it", () => {
    expect(normalizeCandidateQuery("  ana  perez ")).toBe("ana  perez");
  });
});
