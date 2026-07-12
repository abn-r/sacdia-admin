"use client";

import { setClientCookie } from "@/lib/cookie.client";
import {
  getPreferencePersistence,
  type PreferenceKey,
  type PreferencePersistence,
  type PreferenceValueMap,
} from "./preferences-config";

function persistByMode(mode: PreferencePersistence, key: string, value: string): void {
  if (mode === "client-cookie") {
    setClientCookie(key, value);
  }
}

export function persistPreference<K extends PreferenceKey>(
  key: K,
  value: PreferenceValueMap[K],
): void {
  persistByMode(getPreferencePersistence(key), key, value);
}
