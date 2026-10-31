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

/**
 * `?local_field_id=` for admins without a local field of their own. Local
 * field roles leave it out: the API uses their field.
 */
function withLocalField(path: string, localFieldId?: number): string {
  return localFieldId === undefined
    ? path
    : `${path}?local_field_id=${encodeURIComponent(String(localFieldId))}`;
}

export async function listInsuranceProducts(
  localFieldId?: number,
): Promise<InsuranceProduct[]> {
  const payload = await apiRequest<unknown>(
    withLocalField("/insurance/products", localFieldId),
  );
  return unwrapApiData<InsuranceProduct[]>(payload);
}

export async function createInsuranceProduct(
  input: CreateInsuranceProductInput,
  localFieldId?: number,
): Promise<InsuranceProduct> {
  const payload = await apiRequest<unknown>(withLocalField("/insurance/products", localFieldId), {
    method: "POST",
    body: input,
  });
  return unwrapApiData<InsuranceProduct>(payload);
}

export async function updateInsuranceProduct(
  productId: number,
  input: UpdateInsuranceProductInput,
  localFieldId?: number,
): Promise<InsuranceProduct> {
  const payload = await apiRequest<unknown>(withLocalField(`/insurance/products/${productId}`, localFieldId), {
    method: "PATCH",
    body: input,
  });
  return unwrapApiData<InsuranceProduct>(payload);
}

export async function listInsuranceCycles(
  localFieldId?: number,
): Promise<InsuranceCycleConfig[]> {
  const payload = await apiRequest<unknown>(
    withLocalField("/insurance/cycles", localFieldId),
  );
  return unwrapApiData<InsuranceCycleConfig[]>(payload);
}

export async function createInsuranceCycle(
  input: CreateInsuranceCycleInput,
  localFieldId?: number,
): Promise<InsuranceCycleConfig> {
  const payload = await apiRequest<unknown>(withLocalField("/insurance/cycles", localFieldId), {
    method: "POST",
    body: input,
  });
  return unwrapApiData<InsuranceCycleConfig>(payload);
}

export async function updateInsuranceCycle(
  cycleConfigId: number,
  input: UpdateInsuranceCycleInput,
  localFieldId?: number,
): Promise<InsuranceCycleConfig> {
  const payload = await apiRequest<unknown>(
    withLocalField(`/insurance/cycles/${cycleConfigId}`, localFieldId),
    { method: "PATCH", body: input },
  );
  return unwrapApiData<InsuranceCycleConfig>(payload);
}
