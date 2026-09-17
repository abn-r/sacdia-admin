import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/**
 * Product UI face is Geist (whole admin). Geist Mono for code.
 * `variable` classes must sit on `<html>` so `:root { --font-sans }` resolves.
 */
export const sansFont = geist;
export const monoFont = geistMono;

export const fontRegistry = {
  geist: {
    label: "Geist",
    font: geist,
  },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontKeys = Object.keys(fontRegistry) as FontKey[];

export const fontVars = [geist.variable, geistMono.variable].join(" ");

export const fontOptions = fontKeys.map((key) => ({
  key,
  label: fontRegistry[key].label,
}));
