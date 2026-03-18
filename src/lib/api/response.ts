export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: T[] }).data;
  }

  return [];
}

export function unwrapObject<T>(payload: unknown): T | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const data = (payload as { data?: unknown }).data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as T;
    }

    return payload as T;
  }

  return null;
}
