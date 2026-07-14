export type AdminUnion = {
  union_id: number;
  name: string;
  abbreviation: string;
  active: boolean;
  country_id: number;
  division_id: number;
  created_at: string | null;
  modified_at: string | null;
};

export type AdminUnionRow = AdminUnion & {
  country_name: string;
  division_name: string;
};

export type UnionPayload = {
  name: string;
  abbreviation: string;
  country_id: number;
  division_id: number;
  active?: boolean;
};

export type UnionListFilters = {
  countryId?: number;
  divisionId?: number;
};
