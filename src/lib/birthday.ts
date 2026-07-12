export type BirthdayParts = {
  month: number;
  day: number;
};

function isValidMonthDay(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(2000, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function getBirthdayParts(birthday: unknown): BirthdayParts | null {
  if (typeof birthday === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday.trim());
    if (!match) return null;

    const month = Number(match[2]);
    const day = Number(match[3]);
    return isValidMonthDay(month, day) ? { month, day } : null;
  }

  if (birthday instanceof Date && !Number.isNaN(birthday.getTime())) {
    const month = birthday.getUTCMonth() + 1;
    const day = birthday.getUTCDate();
    return isValidMonthDay(month, day) ? { month, day } : null;
  }

  return null;
}

export function isBirthdayToday(
  birthday: unknown,
  today: Date = new Date(),
): boolean {
  const parts = getBirthdayParts(birthday);
  if (!parts || Number.isNaN(today.getTime())) return false;

  return parts.month === today.getMonth() + 1 && parts.day === today.getDate();
}

export function getBirthdayDismissalKey(params: {
  userId: string | null | undefined;
  birthday: unknown;
  today?: Date;
}): string | null {
  const normalizedUserId = params.userId?.trim();
  const parts = getBirthdayParts(params.birthday);
  const today = params.today ?? new Date();

  if (!normalizedUserId || !parts || Number.isNaN(today.getTime())) {
    return null;
  }

  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `sacdia:birthday:${normalizedUserId}:${today.getFullYear()}:${month}-${day}`;
}
