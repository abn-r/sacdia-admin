import type { AssignableRole } from "@/lib/api/clubs";

export type MemberEligibility =
  | { status: "ok" }
  | { status: "blocked"; code: string | null }
  | { status: "unknown" };

/** Eligibility of one person for one role, from the `assignable-roles` answer. */
export function eligibilityForRole(
  roles: AssignableRole[] | undefined,
  roleId: string,
): MemberEligibility {
  const role = roles?.find((row) => row.role_id === roleId);
  if (!role) return { status: "unknown" };
  return role.allowed ? { status: "ok" } : { status: "blocked", code: role.violation_code };
}

/**
 * Runs `worker` over `items` with at most `concurrency` calls in flight. The
 * API answers eligibility one person at a time; this keeps a 60-member
 * section from firing 60 requests at once.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index] as T);
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, run),
  );
  return results;
}
