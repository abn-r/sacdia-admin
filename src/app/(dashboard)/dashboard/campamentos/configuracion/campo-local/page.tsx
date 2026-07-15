import {
  CamporeeScopeConfigPage,
} from "@/components/campamentos/camporee-scope-config-page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CampamentosLocalFieldConfigPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <CamporeeScopeConfigPage scope="local_field" searchParams={searchParams} />
  );
}
