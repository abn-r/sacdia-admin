import { getTranslations } from "next-intl/server";

import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { RouteFormModal } from "@/components/shared/form-modal";

type FormModalForbiddenProps = {
  title: string;
  description?: string;
  className?: string;
  /** Direct load / refresh: replaces the URL with the list instead of popping. */
  dismissHref?: string;
};

/**
 * Forbidden state of an intercepted-route form: the same modal frame the
 * form would use, with the shared forbidden banner inside (no AlertDialog).
 * Rendered when the actor lacks the screen capability of the form.
 */
export async function FormModalForbidden({
  title,
  description,
  className,
  dismissHref,
}: FormModalForbiddenProps) {
  const t = await getTranslations("access.modal");

  return (
    <RouteFormModal
      title={title}
      description={description}
      className={className}
      dismissHref={dismissHref}
    >
      <div className="px-6 pb-4">
        <EndpointErrorBanner state="forbidden" detail={t("forbiddenDetail")} />
      </div>
    </RouteFormModal>
  );
}
