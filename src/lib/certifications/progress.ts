type AnyRecord = Record<string, unknown>;

export type ProgressSection = {
  section_id: number;
  title: string | null;
  completed: boolean;
  completed_at: string | null;
};

export type ProgressModule = {
  module_id: number;
  title: string | null;
  sections: ProgressSection[];
};

export type ProgressData = {
  user_id: string;
  certification_id: number;
  certification_name: string | null;
  status: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  progress_percent: number | null;
  modules: ProgressModule[];
};

/** Unsaved section marks, keyed by section id (only entries that differ from the saved state). */
export type ProgressDraft = Record<number, boolean>;

export type SectionChange = { section_id: number; completed: boolean };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function num(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Reads `GET /certifications/users/:userId/certifications/:id/progress`.
 * The live contract uses `name`, `completion_date`, `progress_percentage` and
 * `enrollment_date`; the legacy names (`title`, `completed_at`,
 * `progress_percent`) are still accepted.
 */
export function normalizeProgress(
  raw: unknown,
  userId: string,
  certificationId: number,
): ProgressData {
  const root = (raw && typeof raw === "object" ? raw : {}) as AnyRecord;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as AnyRecord;
  const rawModules = Array.isArray(data.modules)
    ? data.modules
    : Array.isArray(data.progress)
      ? data.progress
      : [];

  const modules = rawModules.map((mod): ProgressModule => {
    const m = (mod && typeof mod === "object" ? mod : {}) as AnyRecord;
    const rawSections = Array.isArray(m.sections) ? m.sections : [];
    return {
      module_id: num(m.module_id) ?? 0,
      title: text(m.name) ?? text(m.title),
      sections: rawSections.map((sec): ProgressSection => {
        const s = (sec && typeof sec === "object" ? sec : {}) as AnyRecord;
        return {
          section_id: num(s.section_id) ?? 0,
          title: text(s.name) ?? text(s.title),
          completed: s.completed === true,
          completed_at: text(s.completion_date) ?? text(s.completed_at),
        };
      }),
    };
  });

  return {
    user_id: userId,
    certification_id: certificationId,
    certification_name: text(data.certification_name),
    status: text(data.status),
    enrolled_at: text(data.enrollment_date) ?? text(data.enrolled_at),
    completed_at: text(data.completed_at) ?? text(data.certified_at),
    progress_percent: num(data.progress_percentage) ?? num(data.progress_percent) ?? num(data.progress),
    modules,
  };
}

export function allSections(modules: ProgressModule[]): ProgressSection[] {
  return modules.flatMap((mod) => mod.sections);
}

/** The mark a section shows: the draft wins over the saved value. */
export function effectiveCompleted(section: ProgressSection, draft: ProgressDraft): boolean {
  return section.section_id in draft ? draft[section.section_id] === true : section.completed;
}

/** Flips a section in the draft; flipping back to the saved value drops the entry. */
export function toggleInDraft(
  draft: ProgressDraft,
  section: ProgressSection,
): ProgressDraft {
  const next = { ...draft };
  const flipped = !effectiveCompleted(section, draft);
  if (flipped === section.completed) delete next[section.section_id];
  else next[section.section_id] = flipped;
  return next;
}

/** Changes the save has to send: draft entries that differ from the saved state. */
export function draftChanges(modules: ProgressModule[], draft: ProgressDraft): SectionChange[] {
  return allSections(modules).flatMap((section) => {
    if (!(section.section_id in draft)) return [];
    const completed = draft[section.section_id] === true;
    return completed === section.completed ? [] : [{ section_id: section.section_id, completed }];
  });
}

export function countCompleted(modules: ProgressModule[], draft: ProgressDraft): number {
  return allSections(modules).filter((section) => effectiveCompleted(section, draft)).length;
}

/** Writes the sections that were saved into the base data and keeps the rest of the draft. */
export function applySaved(
  modules: ProgressModule[],
  draft: ProgressDraft,
  savedIds: number[],
  savedAt: string,
): { modules: ProgressModule[]; draft: ProgressDraft } {
  const saved = new Set(savedIds);
  const nextDraft = { ...draft };
  for (const id of saved) delete nextDraft[id];
  return {
    draft: nextDraft,
    modules: modules.map((mod) => ({
      ...mod,
      sections: mod.sections.map((section) =>
        saved.has(section.section_id)
          ? {
              ...section,
              completed: draft[section.section_id] === true,
              completed_at: draft[section.section_id] === true ? savedAt : null,
            }
          : section,
      ),
    })),
  };
}
