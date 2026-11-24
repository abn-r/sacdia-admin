import { TransactionModal } from "@/components/finances/transaction-modal";

export default async function NewTransactionModal({
  searchParams,
}: {
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  return <TransactionModal searchParams={await searchParams} />;
}
