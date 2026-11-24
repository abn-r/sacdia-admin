import type { InsuranceOverviewPerson, InsurancePersonStatus } from "@/lib/api/insurance";

export type InsuranceTab = "uninsured" | "in_process" | "covered";

export const INSURANCE_TAB_DEFAULT: InsuranceTab = "uninsured";
export const INSURANCE_TABS: readonly InsuranceTab[] = ["uninsured", "in_process", "covered"];

const IN_PROCESS: readonly InsurancePersonStatus[] = ["in_order", "in_review", "proof_rejected"];

export function insuranceTabOf(status: InsurancePersonStatus): InsuranceTab {
  if (status === "covered") return "covered";
  return IN_PROCESS.includes(status) ? "in_process" : "uninsured";
}

export function parseInsuranceTab(value: string | null | undefined): InsuranceTab {
  return INSURANCE_TABS.find((tab) => tab === value) ?? INSURANCE_TAB_DEFAULT;
}

export function groupInsurancePeople(people: InsuranceOverviewPerson[]): Record<InsuranceTab, InsuranceOverviewPerson[]> {
  const groups: Record<InsuranceTab, InsuranceOverviewPerson[]> = {
    uninsured: [],
    in_process: [],
    covered: [],
  };
  for (const person of people) groups[insuranceTabOf(person.status)].push(person);
  for (const tab of INSURANCE_TABS) {
    groups[tab].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }
  return groups;
}
