/**
 * Rubrics are saved with a second call (PUT /camporee-events/:id/rubrics)
 * after the event itself has been created or updated. These helpers decide
 * whether that second call is needed at all.
 *
 * Kept outside `actions.ts` because "use server" modules can only export
 * async functions.
 */

/** Hidden input telling the server whether the event already had rubrics/scoring. */
export const RUBRICS_INITIALLY_CONFIGURED_FIELD = "rubrics_initially_configured";

function parseRubricItems(raw: FormDataEntryValue | null): unknown[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * False when there is nothing to change: scoring is off, no rubric items were
 * sent and the event had no rubrics/scoring before. Calling the endpoint in
 * that case can only fail (the backend rejects an empty replace on events
 * without rubrics) without changing anything.
 */
export function shouldSyncRubrics(formData: FormData): boolean {
  if (!formData.has("scoring_enabled") && !formData.has("rubrics")) return false;

  const scoringEnabled =
    formData.get("scoring_enabled") === "on" || formData.get("scoring_enabled") === "true";
  const items = parseRubricItems(formData.get("rubrics"));
  const initiallyConfigured = formData.get(RUBRICS_INITIALLY_CONFIGURED_FIELD) === "true";

  return scoringEnabled || items.length > 0 || initiallyConfigured;
}
