import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
import { camporeeScreenId, canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadCreateCamporeePaymentFormData,
} from "@/lib/camporees/payment-form-data";


type Params = Promise<{ id: string }>;

export default async function CamporeePaymentNewModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const t = await getTranslations("camporees.paymentDialog");

  // Camporee payments are written through the camporee itself (camporees:update):
  // same gate as the detail page actions.
  if (!canCapability(user, camporeeScreenId("local"), "update")) {
    return <FormModalForbidden title={t("titleCreate")} description={t("descriptionCreate")} />;
  }

  const props = await loadCreateCamporeePaymentFormData(id);

  return (
    <RouteFormModal
      title={t("titleCreate")}
      description={t("descriptionCreate")}
    >
      <PaymentFormPage {...props} />
    </RouteFormModal>
  );
}
