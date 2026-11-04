import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
import { camporeeScreenId, canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  camporeePaymentsListHref,
  loadCreateCamporeePaymentFormData,
} from "@/lib/camporees/payment-form-data";
import CamporeeDetailPage from "../../page";

type Params = Promise<{ id: string }>;

/**
 * Direct load / refresh: the payments tab renders underneath and the form
 * opens as the same modal the intercepted route shows.
 */
export default async function CamporeePaymentNewPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const t = await getTranslations("camporees.paymentDialog");

  // Camporee payments are written through the camporee itself (camporees:update):
  // same gate as the detail page actions.
  if (!canCapability(user, camporeeScreenId("local"), "update")) {
    return <FormModalForbidden title={t("titleCreate")} description={t("descriptionCreate")} dismissHref={camporeePaymentsListHref(id)} />;
  }

  const props = await loadCreateCamporeePaymentFormData(id);

  return (
    <>
      <CamporeeDetailPage params={params} searchParams={Promise.resolve({ tab: "payments" })} />
      <RouteFormModal
        title={t("titleCreate")}
        description={t("descriptionCreate")}
        dismissHref={camporeePaymentsListHref(id)}
      >
        <PaymentFormPage {...props} />
      </RouteFormModal>
    </>
  );
}
