/**
 * Admin API client for insurance capacity-model configuration
 * (products + cycle configs of the effective Local Field).
 * Backend: GET/POST/PATCH /insurance/products, /insurance/cycles
 * Permission: insurance:configure
 */
import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type InsuranceCoverageScope = "MEMBER" | "EVENT_EXTERNAL" | string;
export type InsuranceValidityMode = "FIXED_MONTHS" | "UNTIL_DATE" | string;

export type InsuranceProduct = {
  insurance_product_id: number;
  local_field_id: number;
  name: string;
  coverage_scope: InsuranceCoverageScope;
  validity_mode: InsuranceValidityMode;
  default_duration_months: number | null;
  active: boolean;
};

export type InsuranceCycleConfig = {
  insurance_cycle_config_id: number;
  insurance_product_id: number;
  local_field_id: number;
  ecclesiastical_year_id: number;
  club_type_id: number;
  unit_cost: string | number;
  purchase_deadline: string;
  timezone: string;
  active: boolean;
  product?: { name: string };
};

export type CreateInsuranceProductInput = {
  name: string;
  coverage_scope: InsuranceCoverageScope;
  validity_mode: InsuranceValidityMode;
  default_duration_months?: number;
  active?: boolean;
};

export type UpdateInsuranceProductInput = Partial<CreateInsuranceProductInput>;

export type CreateInsuranceCycleInput = {
  insurance_product_id: number;
  ecclesiastical_year_id: number;
  club_type_id: number;
  unit_cost: number;
  purchase_deadline: string;
  timezone: string;
  active?: boolean;
};

export type UpdateInsuranceCycleInput = {
  unit_cost?: number;
  purchase_deadline?: string;
  timezone?: string;
  active?: boolean;
};

export async function listInsuranceProducts(): Promise<InsuranceProduct[]> {
  const payload = await apiRequest<unknown>("/insurance/products");
  return unwrapApiData<InsuranceProduct[]>(payload);
}

export async function createInsuranceProduct(
  input: CreateInsuranceProductInput,
): Promise<InsuranceProduct> {
  const payload = await apiRequest<unknown>("/insurance/products", {
    method: "POST",
    body: input,
  });
  return unwrapApiData<InsuranceProduct>(payload);
}

export async function updateInsuranceProduct(
  productId: number,
  input: UpdateInsuranceProductInput,
): Promise<InsuranceProduct> {
  const payload = await apiRequest<unknown>(`/insurance/products/${productId}`, {
    method: "PATCH",
    body: input,
  });
  return unwrapApiData<InsuranceProduct>(payload);
}

export async function listInsuranceCycles(): Promise<InsuranceCycleConfig[]> {
  const payload = await apiRequest<unknown>("/insurance/cycles");
  return unwrapApiData<InsuranceCycleConfig[]>(payload);
}

export async function createInsuranceCycle(
  input: CreateInsuranceCycleInput,
): Promise<InsuranceCycleConfig> {
  const payload = await apiRequest<unknown>("/insurance/cycles", {
    method: "POST",
    body: input,
  });
  return unwrapApiData<InsuranceCycleConfig>(payload);
}

export async function updateInsuranceCycle(
  cycleConfigId: number,
  input: UpdateInsuranceCycleInput,
): Promise<InsuranceCycleConfig> {
  const payload = await apiRequest<unknown>(
    `/insurance/cycles/${cycleConfigId}`,
    { method: "PATCH", body: input },
  );
  return unwrapApiData<InsuranceCycleConfig>(payload);
}
