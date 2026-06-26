import type { CamporeeEvent } from "./types";

export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const durMin = (start: string, end: string): number => {
  const diff = toMin(end) - toMin(start);
  return diff < 0 ? diff + 1440 : diff;
};

export const initials = (name: string): string =>
  name
    .split(" ")
    .filter((w) => w[0] && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || name.slice(0, 2).toUpperCase();

export const sortByStart = (a: CamporeeEvent, b: CamporeeEvent): number =>
  toMin(a.startsAt) - toMin(b.startsAt);

export const formatHours = (minutes: number): string => (minutes / 60).toFixed(1);
