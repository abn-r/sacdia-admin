export type AdminLocalField = {
  local_field_id: number;
  name: string;
  abbreviation: string;
  active: boolean;
  union_id: number;
  timezone?: string | null;
  created_at: string | null;
  modified_at: string | null;
};

export type AdminLocalFieldRow = AdminLocalField & {
  union_name: string;
};

export type LocalFieldPayload = {
  name: string;
  abbreviation: string;
  union_id: number;
  active?: boolean;
  timezone?: string | null;
};

export type LocalFieldListFilters = {
  unionId?: number;
};
