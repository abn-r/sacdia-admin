/**
 * Mirrors `SearchPastorCandidatesDto` (GET /investiture-pastor-candidates):
 * the trimmed query needs at least 3 characters, every word at least 2, and at
 * most 100 characters. Outside those rules the backend answers 400 (it does not
 * return `[]`), so the client never calls it and shows its own hint instead.
 */
export const CANDIDATE_QUERY_MIN = 3;
export const CANDIDATE_TOKEN_MIN = 2;
export const CANDIDATE_QUERY_MAX = 100;

export function normalizeCandidateQuery(query: string): string {
  return query.trim();
}

export function canSearchPastorCandidates(query: string): boolean {
  const normalized = normalizeCandidateQuery(query);
  if (normalized.length < CANDIDATE_QUERY_MIN || normalized.length > CANDIDATE_QUERY_MAX) {
    return false;
  }
  return normalized.split(/\s+/).every((word) => word.length >= CANDIDATE_TOKEN_MIN);
}
