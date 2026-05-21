export function formatClassDurationRange(minDurationYears: number, maxDurationYears: number): string {
  const min = Number.isFinite(minDurationYears) && minDurationYears >= 1
    ? Math.floor(minDurationYears)
    : 1;
  const max = Number.isFinite(maxDurationYears) && maxDurationYears >= min
    ? Math.floor(maxDurationYears)
    : min;

  if (min === max) {
    return `${min} ${min === 1 ? "año" : "años"}`;
  }

  return `${min}–${max} años`;
}

export function formatClassAvailabilityUntil(
  availableUntilYearId: number | null | undefined,
  yearLabel?: string | null,
): string {
  if (availableUntilYearId == null) {
    return "Sin expiración programada";
  }

  const label = yearLabel?.trim() || `Año #${availableUntilYearId}`;
  return `Disponible hasta año eclesiástico ${label}`;
}

export function formatClassAvailabilityFrom(
  availableFromYearId: number | null | undefined,
  yearLabel?: string | null,
): string {
  if (availableFromYearId == null) {
    return "Disponible desde cualquier año";
  }

  const label = yearLabel?.trim() || `Año #${availableFromYearId}`;
  return `Disponible desde año eclesiástico ${label}`;
}
