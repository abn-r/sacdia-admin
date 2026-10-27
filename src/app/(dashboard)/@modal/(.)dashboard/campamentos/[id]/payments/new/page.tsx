import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import { loadCreateCamporeePaymentFormData } from "@/lib/camporees/payment-form-data";

type Params = Promise<{ id: string }>;

export default async function CamporeePaymentNewModal({ params }: { params: Params }) {
  await requireAdminUser();
  const { id } = await params;
  const props = await loadCreateCamporeePaymentFormData(id);
  const t = await getTranslations("camporees.paymentDialog");

  return (
    <RouteFormModal title={t("titleCreate")} description={t("descriptionCreate")}>
      <PaymentFormPage {...props} />
    </RouteFormModal>
  );
}
