import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
import { camporeeScreenId, canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadEditCamporeePaymentFormData,
} from "@/lib/camporees/payment-form-data";


type Params = Promise<{ id: string; paymentId: string }>;

export default async function CamporeePaymentEditModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id, paymentId } = await params;
  const t = await getTranslations("camporees.paymentDialog");

  // Camporee payments are written through the camporee itself (camporees:update):
  // same gate as the detail page actions.
  if (!canCapability(user, camporeeScreenId("local"), "update")) {
    return <FormModalForbidden title={t("titleEdit")} description={t("descriptionEdit")} />;
  }

  const props = await loadEditCamporeePaymentFormData(id, paymentId);

  return (
    <RouteFormModal
      title={t("titleEdit")}
      description={t("descriptionEdit")}
    >
      <PaymentFormPage {...props} />
    </RouteFormModal>
  );
}
