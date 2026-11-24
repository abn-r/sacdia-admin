import { notFound } from "next/navigation";
import { TransactionModal } from "@/components/finances/transaction-modal";
import FinancesPage from "../../page";

type Search = { club?: string | string[]; section?: string | string[] };

/** Direct load of /finances/[id]/edit: the list renders underneath, the form opens as the same modal. */
export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const financeId = Number((await params).id);
  if (!Number.isInteger(financeId) || financeId <= 0) notFound();
  const search = await searchParams;
  return (
    <>
      <FinancesPage searchParams={Promise.resolve(search)} />
      <TransactionModal searchParams={search} financeId={financeId} dismissHref="/dashboard/finances" />
    </>
  );
}
