export type ClassDisplayLabels = {
  yearSingular: string;
  yearPlural: string;
  yearFallback: (yearId: number) => string;
  availableFromAnyYear: string;
  noProgrammedExpiration: string;
  availableFromYear: (yearLabel: string) => string;
  availableUntilYear: (yearLabel: string) => string;
};

export function formatClassDurationRange(
  minDurationYears: number,
  maxDurationYears: number,
  labels: Pick<ClassDisplayLabels, "yearSingular" | "yearPlural">,
): string {
  const min = Number.isFinite(minDurationYears) && minDurationYears >= 1
    ? Math.floor(minDurationYears)
    : 1;
  const max = Number.isFinite(maxDurationYears) && maxDurationYears >= min
    ? Math.floor(maxDurationYears)
    : min;

  if (min === max) {
    return `${min} ${min === 1 ? labels.yearSingular : labels.yearPlural}`;
  }

  return `${min}–${max} ${labels.yearPlural}`;
}

export function formatClassAvailabilityUntil(
  availableUntilYearId: number | null | undefined,
  labels: Pick<ClassDisplayLabels, "yearFallback" | "noProgrammedExpiration" | "availableUntilYear">,
  yearLabel?: string | null,
): string {
  if (availableUntilYearId == null) {
    return labels.noProgrammedExpiration;
  }

  const label = yearLabel?.trim() || labels.yearFallback(availableUntilYearId);
  return labels.availableUntilYear(label);
}

export function formatClassAvailabilityFrom(
  availableFromYearId: number | null | undefined,
  labels: Pick<ClassDisplayLabels, "yearFallback" | "availableFromAnyYear" | "availableFromYear">,
  yearLabel?: string | null,
): string {
  if (availableFromYearId == null) {
    return labels.availableFromAnyYear;
  }

  const label = yearLabel?.trim() || labels.yearFallback(availableFromYearId);
  return labels.availableFromYear(label);
}
