"use server";

import { cookies } from "next/headers";

import {
  getPreferencePersistence,
  PREFERENCE_REGISTRY,
  type PreferenceKey,
  type PreferenceValueMap,
  parsePreference,
} from "@/lib/preferences/preferences-config";

const PREFERENCE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function isPreferenceKey(key: string): key is PreferenceKey {
  return Object.hasOwn(PREFERENCE_REGISTRY, key);
}

/**
 * Writes one UI preference cookie.
 *
 * Every exported server action is a public endpoint that any page script can
 * call with any arguments. So this only accepts a registered "server-cookie"
 * preference with one of its allowed values, and ignores everything else. It
 * can never read or overwrite the auth cookies.
 */
export async function setPreferenceCookie(key: string, value: string): Promise<void> {
  if (!isPreferenceKey(key) || getPreferencePersistence(key) !== "server-cookie") {
    return;
  }

  const allowedValues = PREFERENCE_REGISTRY[key].values as readonly string[];
  if (!allowedValues.includes(value)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(key, value, {
    path: "/",
    maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getPreference<K extends PreferenceKey>(key: K): Promise<PreferenceValueMap[K]> {
  const definition = PREFERENCE_REGISTRY[key];
  const persistence = getPreferencePersistence(key);

  if (persistence !== "client-cookie" && persistence !== "server-cookie") {
    return definition.defaultValue as PreferenceValueMap[K];
  }

  const cookieStore = await cookies();
  return parsePreference(key, cookieStore.get(key)?.value.trim());
}
