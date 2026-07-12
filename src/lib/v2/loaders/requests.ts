import { ApiError } from "@/lib/api/client";
import {
  getAssignmentRequests,
  getTransferRequests,
  type AssignmentRequest,
  type TransferRequest,
} from "@/lib/api/requests";

export type RequestsListResult<T> = {
  items: T[];
  error: { message: string; status: number | null } | null;
};

async function loadRequestList<T>(
  fetcher: () => Promise<T[]>,
): Promise<RequestsListResult<T>> {
  try {
    const items = await fetcher();
    return {
      items: Array.isArray(items) ? items : [],
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        items: [],
        error: { message: error.message, status: error.status },
      };
    }

    return {
      items: [],
      error: { message: "", status: null },
    };
  }
}

export async function loadAssignmentRequestsList(): Promise<
  RequestsListResult<AssignmentRequest>
> {
  return loadRequestList(getAssignmentRequests);
}

export async function loadTransferRequestsList(): Promise<
  RequestsListResult<TransferRequest>
> {
  return loadRequestList(getTransferRequests);
}
