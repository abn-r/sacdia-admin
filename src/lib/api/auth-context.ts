import { apiRequestFromClient } from "@/lib/api/client";

type ApiEnvelope<T> = { status: string; data: T };

export type ActiveClubContextResponse = {
  active_assignment_id: string | null;
  authorization?: unknown;
  club?: unknown;
  active?: unknown;
};

function unwrapApiData<T>(value: T | ApiEnvelope<T>): T {
  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    "status" in value
  ) {
    return (value as ApiEnvelope<T>).data;
  }

  return value as T;
}

export async function setActiveClubContext(
  assignmentId: string,
): Promise<ActiveClubContextResponse> {
  const res = await apiRequestFromClient<
    ActiveClubContextResponse | ApiEnvelope<ActiveClubContextResponse>
  >("/auth/me/context", {
    method: "PATCH",
    body: { assignment_id: assignmentId },
  });

  return unwrapApiData(res);
}
