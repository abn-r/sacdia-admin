import {
  CamporeeScopeConfigPage,
} from "@/components/campamentos/camporee-scope-config-page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CampamentosUnionConfigPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <CamporeeScopeConfigPage scope="union" searchParams={searchParams} />
  );
}
