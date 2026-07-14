export type AdminClubType = {
  club_type_id: number;
  name: string;
  active: boolean;
  created_at: string | null;
  modified_at: string | null;
};

export type ClubTypePayload = {
  name: string;
  active?: boolean;
};
