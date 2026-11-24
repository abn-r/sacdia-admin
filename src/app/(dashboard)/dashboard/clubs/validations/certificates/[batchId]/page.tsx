import { redirect } from "next/navigation";

interface LegacyCertificateBatchRouteProps {
  params: Promise<{ batchId: string }>;
}

/** Legacy link: the batch review now lives under Certificados. */
export default async function LegacyCertificateBatchRoute({ params }: LegacyCertificateBatchRouteProps) {
  const { batchId } = await params;
  redirect(`/dashboard/certificate-bulk-imports/${encodeURIComponent(batchId)}`);
}
