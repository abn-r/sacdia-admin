import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import { loadEditCamporeePaymentFormData } from "@/lib/camporees/payment-form-data";

type Params = Promise<{ id: string; paymentId: string }>;

export default async function CamporeePaymentEditModal({ params }: { params: Params }) {
  await requireAdminUser();
  const { id, paymentId } = await params;
  const props = await loadEditCamporeePaymentFormData(id, paymentId);
  const t = await getTranslations("camporees.paymentDialog");

  return (
    <RouteFormModal title={t("titleEdit")} description={t("descriptionEdit")}>
      <PaymentFormPage {...props} />
    </RouteFormModal>
  );
}
