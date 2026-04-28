"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import {
  updateAdminUserApproval,
  type AdminApprovalDecision,
} from "@/lib/api/admin-users";
import {
  APP_ALERT_PARAM_TYPE,
  APP_ALERT_PARAM_TITLE,
  APP_ALERT_PARAM_DESCRIPTION,
} from "@/lib/ui/app-alert-params";
import { requireAdminUser } from "@/lib/auth/session";

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function userDetailUrl(userId: string, alertType: string, alertTitle: string, alertDescription?: string): string {
  const params = new URLSearchParams();
  params.set(APP_ALERT_PARAM_TYPE, alertType);
  params.set(APP_ALERT_PARAM_TITLE, alertTitle);
  if (alertDescription) {
    params.set(APP_ALERT_PARAM_DESCRIPTION, alertDescription);
  }
  return `/dashboard/users/${encodeURIComponent(userId)}?${params.toString()}`;
}

export async function submitApprovalDecisionAction(formData: FormData) {
  await requireAdminUser();
  const t = await getTranslations("admin_users");

  const userId = readString(formData, "user_id");
  const decision = readString(formData, "decision");
  const reason = readString(formData, "reason");

  if (!userId) {
    redirect("/dashboard/users");
  }

  if (decision !== "approve" && decision !== "reject") {
    redirect(
      userDetailUrl(
        userId,
        "error",
        t("errors.invalid_decision_title"),
        t("errors.invalid_decision_description"),
      ),
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
          userDetailUrl(
            userId,
            "warning",
            t("errors.too_many_requests_title"),
            t("errors.too_many_requests_description"),
          ),
        );
      }

      if (error.status === 401 || error.status === 403) {
        redirect(
          userDetailUrl(
            userId,
            "error",
            t("errors.forbidden_title"),
            t("errors.forbidden_description"),
          ),
        );
      }

      if (error.status === 404 || error.status === 405) {
        redirect(
          userDetailUrl(
            userId,
            "error",
            t("errors.endpoint_unavailable_title"),
            t("errors.endpoint_unavailable_description"),
          ),
        );
      }

      redirect(
        userDetailUrl(
          userId,
          "error",
          t("errors.processing_title"),
          error.message,
        ),
      );
    }

    redirect(
      userDetailUrl(
        userId,
        "error",
        t("errors.unexpected_title"),
        t("errors.unexpected_description"),
      ),
    );
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard");

  const title =
    decision === "approve"
      ? t("success.user_approved_title")
      : t("success.user_rejected_title");
  redirect(
    userDetailUrl(userId, "success", title, t("success.decision_recorded")),
  );
}
