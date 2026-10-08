/**
 * Mirrors `SearchPastorCandidatesDto` (GET /investiture-pastor-candidates):
 * the trimmed query needs at least 3 characters, every word at least 2, and at
 * most 100 characters. Below that the backend answers `[]`, so the client does
 * not even call it.
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
