"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  updateAdminUserApproval,
  type AdminApprovalDecision,
} from "@/lib/api/admin-users";

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function createResultUrl(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return `/dashboard/approvals?${query.toString()}`;
}

export async function submitApprovalDecisionAction(formData: FormData) {
  const userId = readString(formData, "user_id");
  const decision = readString(formData, "decision");
  const reason = readString(formData, "reason");

  if (!userId) {
    redirect(
      createResultUrl({
        status: "approval_error_validation",
        message: "Usuario invalido",
      }),
    );
  }

  if (decision !== "approve" && decision !== "reject") {
    redirect(
      createResultUrl({
        status: "approval_error_validation",
        message: "Decision invalida",
      }),
    );
  }

  try {
    await updateAdminUserApproval({
      userId,
      decision: decision as AdminApprovalDecision,
      reason: reason || undefined,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        redirect(
          createResultUrl({
            status: "approval_error_rate_limited",
            decision,
            user: userId,
          }),
        );
      }

      if (error.status === 401 || error.status === 403) {
        redirect(
          createResultUrl({
            status: "approval_error_forbidden",
            decision,
            user: userId,
          }),
        );
      }

      if (error.status === 404 || error.status === 405) {
        redirect(
          createResultUrl({
            status: "approval_error_missing_endpoint",
            decision,
            user: userId,
          }),
        );
      }

      redirect(
        createResultUrl({
          status: "approval_error_api",
          decision,
          user: userId,
          message: error.message,
        }),
      );
    }

    redirect(
      createResultUrl({
        status: "approval_error_unknown",
        decision,
        user: userId,
      }),
    );
  }

  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  redirect(
    createResultUrl({
      status: "approval_success",
      decision,
      user: userId,
    }),
  );
}
