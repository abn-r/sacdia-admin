import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
import { camporeeScreenId, canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  camporeePaymentsListHref,
  loadEditCamporeePaymentFormData,
} from "@/lib/camporees/payment-form-data";
import CamporeeDetailPage from "../../../page";

type Params = Promise<{ id: string; paymentId: string }>;

/**
 * Direct load / refresh: the payments tab renders underneath and the form
 * opens as the same modal the intercepted route shows.
 */
export default async function CamporeePaymentEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id, paymentId } = await params;
  const t = await getTranslations("camporees.paymentDialog");

  // Camporee payments are written through the camporee itself (camporees:update):
  // same gate as the detail page actions.
  if (!canCapability(user, camporeeScreenId("local"), "update")) {
    return <FormModalForbidden title={t("titleEdit")} description={t("descriptionEdit")} dismissHref={camporeePaymentsListHref(id)} />;
  }

  const props = await loadEditCamporeePaymentFormData(id, paymentId);

  return (
    <>
      <CamporeeDetailPage
        params={Promise.resolve({ id })}
        searchParams={Promise.resolve({ tab: "payments" })}
      />
      <RouteFormModal
        title={t("titleEdit")}
        description={t("descriptionEdit")}
        dismissHref={camporeePaymentsListHref(id)}
      >
        <PaymentFormPage {...props} />
      </RouteFormModal>
    </>
  );
}
