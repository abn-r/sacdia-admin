import { getFinance, type Finance } from "@/lib/api/finances";
import { listClubTypes } from "@/lib/api/catalogs";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";
import { loadClubContextClubs } from "@/lib/club-context/load-clubs";
import { resolveClubContext } from "@/lib/club-context/scope";
import type { ClubContextClub } from "@/lib/club-context/types";
import type { FinanceClubSection } from "@/lib/finances/club-sections";

export type TransactionFormData = {
  club: ClubContextClub;
  sections: FinanceClubSection[];
  /** Section preselected in the form (the one chosen in the context bar). */
  defaultSectionId: number | null;
  finance: Finance | null;
};

type SearchValue = string | string[] | undefined;

/**
 * Data of the new / edit movement modal, shared by the intercepted and the
 * direct route. Returns `null` when the actor cannot do it or the club (or the
 * movement) cannot be resolved.
 */
export async function loadTransactionFormData(
  user: AuthUser,
  args: {
    searchParams: { club?: SearchValue; section?: SearchValue };
    cookie?: string | null;
    financeId?: number;
  },
): Promise<TransactionFormData | null> {
  const isEdit = args.financeId !== undefined;
  if (!canCapability(user, "finances", isEdit ? "update" : "create")) return null;

  const clubTypes = await listClubTypes().catch(() => []);
  const result = await loadClubContextClubs(clubTypes);
  if (!result.ok) return null;

  const { club, section } = resolveClubContext({
    clubs: result.clubs,
    searchParams: args.searchParams,
    cookie: args.cookie,
  });
  if (!club) return null;

  let finance: Finance | null = null;
  if (args.financeId !== undefined) {
    finance = await getFinance(args.financeId).catch(() => null);
    if (!finance) return null;
  }

  return {
    club,
    sections: club.sections,
    defaultSectionId: section?.club_section_id ?? club.sections[0]?.club_section_id ?? null,
    finance,
  };
}
