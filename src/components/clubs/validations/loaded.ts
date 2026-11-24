import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";

/** Server-side result of a fetch that crosses to the client: an error never looks like empty. */
export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ErrorStateFromError };

export async function settle<T>(promise: Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return { ok: false, error: errorStateFromError(error) };
  }
}
