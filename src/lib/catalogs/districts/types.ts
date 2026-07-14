export type AdminDistrictApi = {
  districlub_type_id: number;
  name: string;
  active: boolean;
  local_field_id: number;
  created_at: string | null;
  modified_at: string | null;
};

export type AdminDistrict = {
  district_id: number;
  name: string;
  active: boolean;
  local_field_id: number;
  created_at: string | null;
  modified_at: string | null;
};

export type AdminDistrictRow = AdminDistrict & {
  local_field_name: string;
};

export type DistrictPayload = {
  name: string;
  local_field_id: number;
  active?: boolean;
};

export type DistrictListFilters = {
  localFieldId?: number;
};

export function normalizeDistrict(row: AdminDistrictApi): AdminDistrict {
  return {
    district_id: row.districlub_type_id,
    name: row.name,
    active: row.active,
    local_field_id: row.local_field_id,
    created_at: row.created_at,
    modified_at: row.modified_at,
  };
}
