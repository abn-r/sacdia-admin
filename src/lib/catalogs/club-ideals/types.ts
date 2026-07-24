export type AdminClubIdeal = {
  club_ideal_id: number;
  name: string;
  ideal: string | null;
  ideal_order: number;
  club_type_id: number;
  active: boolean;
  created_at: string | null;
  modified_at: string | null;
};

export type AdminClubIdealRow = AdminClubIdeal & {
  club_type_name: string;
};

export type ClubIdealPayload = {
  name: string;
  ideal?: string;
  ideal_order: number;
  club_type_id: number;
  active?: boolean;
};

export type ClubIdealUpdatePayload = {
  name?: string;
  ideal?: string;
  ideal_order?: number;
  active?: boolean;
};
