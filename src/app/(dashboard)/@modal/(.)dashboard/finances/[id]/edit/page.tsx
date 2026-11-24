import { notFound } from "next/navigation";
import { TransactionModal } from "@/components/finances/transaction-modal";

export default async function EditTransactionModal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  const financeId = Number((await params).id);
  if (!Number.isInteger(financeId) || financeId <= 0) notFound();
  return <TransactionModal searchParams={await searchParams} financeId={financeId} />;
}
