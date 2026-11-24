import { redirect } from "next/navigation";

type Params = Promise<{ folio: string }>;

/** Receipts are reviewed in the order detail (section "Comprobante de pago"). */
export default async function MaterialsReceiptDetailRedirectPage({ params }: { params: Params }) {
  const { folio } = await params;
  redirect(`/dashboard/materials/request/${encodeURIComponent(folio)}`);
}
