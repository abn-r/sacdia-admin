export interface ScoreEntryRubric {
  camporee_event_rubric_id: number;
  max_points: number;
}

export function scoreEntryTotals(
  rubrics: ReadonlyArray<ScoreEntryRubric>,
  points: Record<number, number>,
): { awarded: number; max: number; overMax: number[] } {
  let awarded = 0;
  let max = 0;
  const overMax: number[] = [];
  for (const rubric of rubrics) {
    const value = Number(points[rubric.camporee_event_rubric_id] ?? 0) || 0;
    const ceiling = Number(rubric.max_points) || 0;
    awarded += value;
    max += ceiling;
    if (value > ceiling) overMax.push(rubric.camporee_event_rubric_id);
  }
  return { awarded, max, overMax };
}
