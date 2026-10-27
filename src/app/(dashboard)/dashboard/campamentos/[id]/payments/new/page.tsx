import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { PaymentFormPage } from "@/components/camporees/payment-form-page";
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
  await requireAdminUser();
  const { id } = await params;
  const props = await loadCreateCamporeePaymentFormData(id);
  const t = await getTranslations("camporees.paymentDialog");

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
