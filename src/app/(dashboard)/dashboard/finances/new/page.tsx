import { TransactionModal } from "@/components/finances/transaction-modal";
import FinancesPage from "../page";

type Search = { club?: string | string[]; section?: string | string[] };

/** Direct load of /finances/new: the list renders underneath, the form opens as the same modal. */
export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  return (
    <>
      <FinancesPage searchParams={Promise.resolve(search)} />
      <TransactionModal searchParams={search} dismissHref="/dashboard/finances" />
    </>
  );
}
