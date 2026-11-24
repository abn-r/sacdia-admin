import type {
  FolderSectionWithEvidences,
  SectionEvaluation,
  SectionEvaluationStatus,
} from "@/lib/api/annual-folders";

/**
 * One state per section: the row and the panel show only this one (never
 * «Requerida» + «Pendiente» + «Pendiente de envío» together).
 */
export type SectionState =
  | "notSent"
  | "toEvaluate"
  | "awaitingUnion"
  | "preapproved"
  | "validated"
  | "rejected";

export function resolveSectionState(
  status: SectionEvaluationStatus | undefined,
  requiresUnionConfirmation: boolean,
): SectionState {
  switch (status) {
    case "SUBMITTED":
      return "toEvaluate";
    case "PREAPPROVED_LF":
      return requiresUnionConfirmation ? "awaitingUnion" : "preapproved";
    case "VALIDATED":
      return "validated";
    case "REJECTED":
      return "rejected";
    case "PENDING":
    default:
      return "notSent";
  }
}

/** States where a decision can still be taken by a reviewer. */
export const ACTIONABLE_STATES: ReadonlySet<SectionState> = new Set([
  "toEvaluate",
]);

/** Evaluations an already-decided section can be reopened from. */
export function canReopenState(state: SectionState): boolean {
  return (
    state === "awaitingUnion" ||
    state === "preapproved" ||
    state === "validated" ||
    state === "rejected"
  );
}

export function sortSections(
  sections: readonly FolderSectionWithEvidences[],
): FolderSectionWithEvidences[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

/**
 * Evaluation of a section: the embedded one (current status and points) with
 * the actors from the evaluations endpoint when it answered.
 */
export function mergeSectionEvaluation(
  section: FolderSectionWithEvidences,
  apiEvaluations: readonly SectionEvaluation[],
): SectionEvaluation | undefined {
  const fromApi = apiEvaluations.find(
    (ev) => String(ev.section_id) === String(section.section_id),
  );
  if (!section.evaluation) return fromApi?.status ? fromApi : undefined;
  return {
    evaluation_id: section.evaluation.evaluation_id,
    section_id: section.section_id,
    section_name: section.name,
    section_order: section.order,
    earned_points: section.evaluation.earned_points,
    max_points: section.evaluation.max_points,
    notes: section.evaluation.notes,
    evaluator: fromApi?.evaluator ?? null,
    evaluated_at: fromApi?.evaluated_at ?? "",
    status: section.evaluation.status,
    lf_approver: fromApi?.lf_approver ?? null,
    lf_approved_at: fromApi?.lf_approved_at ?? null,
    union_approver: fromApi?.union_approver ?? null,
    union_approved_at: fromApi?.union_approved_at ?? null,
    union_decision: fromApi?.union_decision ?? null,
  };
}

export type SectionItem = { id: string; state: SectionState };

/**
 * Next section after `currentId` (in order, wrapping once) whose state is in
 * `states`. `null` when nothing else is left.
 */
export function nextSectionId(
  items: readonly SectionItem[],
  currentId: string | null,
  states: ReadonlySet<SectionState> = ACTIONABLE_STATES,
): string | null {
  const start = items.findIndex((item) => item.id === currentId);
  for (let step = 1; step <= items.length; step += 1) {
    const candidate = items[(start + step + items.length) % items.length];
    if (candidate && candidate.id !== currentId && states.has(candidate.state)) {
      return candidate.id;
    }
  }
  return null;
}

/** Where the review opens: first thing to decide, else the first section. */
export function defaultSectionId(
  items: readonly SectionItem[],
  options: { focusUnion?: boolean; canConfirmUnion?: boolean } = {},
): string | null {
  const first = (state: SectionState) =>
    items.find((item) => item.state === state)?.id;
  const picked =
    options.focusUnion && options.canConfirmUnion !== false
      ? (first("awaitingUnion") ?? first("toEvaluate"))
      : (first("toEvaluate") ??
        (options.canConfirmUnion ? first("awaitingUnion") : undefined));
  return picked ?? items[0]?.id ?? null;
}

export type PointsCheck =
  | { ok: true; value: number }
  | { ok: false; error: "required" | "integer" | "negative" | "max" };

export function validatePoints(raw: string, max: number): PointsCheck {
  const text = raw.trim();
  if (text === "") return { ok: false, error: "required" };
  const value = Number(text);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, error: "integer" };
  }
  if (value < 0) return { ok: false, error: "negative" };
  if (value > max) return { ok: false, error: "max" };
  return { ok: true, value };
}

/** Latest of the evidence dates, for «enviado el …». */
export function latestEvidenceDate(
  section: FolderSectionWithEvidences,
): string | null {
  const submitted = section.submission?.submitted_at;
  if (submitted) return submitted;
  const dates = section.evidences
    .map((e) => e.uploaded_at ?? e.created_at ?? null)
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.length > 0 ? (dates[dates.length - 1] ?? null) : null;
}
