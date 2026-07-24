export type AdminCountry = {
  country_id: number;
  name: string;
  abbreviation: string;
  active: boolean;
  created_at: string | null;
  modified_at: string | null;
};

export type CountryPayload = {
  name: string;
  abbreviation: string;
  active?: boolean;
};
