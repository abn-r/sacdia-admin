"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";

const LS_KEY_CLUB = "sacdia.active_club_id";
const LS_KEY_YEAR = "sacdia.active_year_id";

type ActiveContextValue = {
  activeClubId: number | null;
  activeYearId: number | null;
  setActiveClubId: (id: number | null) => void;
  setActiveYearId: (id: number | null) => void;
};

const ActiveContext = createContext<ActiveContextValue | null>(null);

type ActiveState = { activeClubId: number | null; activeYearId: number | null };
type ActiveAction =
  | { type: "HYDRATE"; clubId: number | null; yearId: number | null }
  | { type: "SET_CLUB"; id: number | null }
  | { type: "SET_YEAR"; id: number | null };

function activeReducer(state: ActiveState, action: ActiveAction): ActiveState {
  switch (action.type) {
    case "HYDRATE":
      return { activeClubId: action.clubId, activeYearId: action.yearId };
    case "SET_CLUB":
      return { ...state, activeClubId: action.id };
    case "SET_YEAR":
      return { ...state, activeYearId: action.id };
  }
}

export function ActiveContextProvider({ children }: { children: ReactNode }) {
  // useReducer + single HYDRATE dispatch avoids cascading setState calls
  // that trigger the react-hooks/set-state-in-effect lint rule.
  // SSR-safe: initial state is null; hydration happens after mount.
  const [{ activeClubId, activeYearId }, dispatch] = useReducer(activeReducer, {
    activeClubId: null,
    activeYearId: null,
  });

  // Hidratar desde localStorage solo en el cliente (single dispatch)
  useEffect(() => {
    const storedClub = localStorage.getItem(LS_KEY_CLUB);
    const storedYear = localStorage.getItem(LS_KEY_YEAR);

    const parsedClub = storedClub !== null ? parseInt(storedClub, 10) : NaN;
    const parsedYear = storedYear !== null ? parseInt(storedYear, 10) : NaN;
    const clubId = !isNaN(parsedClub) ? parsedClub : null;
    const yearId = !isNaN(parsedYear) ? parsedYear : null;

    dispatch({ type: "HYDRATE", clubId, yearId });
  }, []);

  // Persistir club activo
  useEffect(() => {
    if (activeClubId === null) {
      localStorage.removeItem(LS_KEY_CLUB);
    } else {
      localStorage.setItem(LS_KEY_CLUB, String(activeClubId));
    }
  }, [activeClubId]);

  // Persistir año activo
  useEffect(() => {
    if (activeYearId === null) {
      localStorage.removeItem(LS_KEY_YEAR);
    } else {
      localStorage.setItem(LS_KEY_YEAR, String(activeYearId));
    }
  }, [activeYearId]);

  function setActiveClubId(id: number | null) {
    dispatch({ type: "SET_CLUB", id });
  }

  function setActiveYearId(id: number | null) {
    dispatch({ type: "SET_YEAR", id });
  }

  return (
    <ActiveContext.Provider
      value={{ activeClubId, activeYearId, setActiveClubId, setActiveYearId }}
    >
      {children}
    </ActiveContext.Provider>
  );
}

export function useActiveContext(): ActiveContextValue {
  const ctx = useContext(ActiveContext);
  if (ctx === null) {
    throw new Error(
      "useActiveContext debe usarse dentro de <ActiveContextProvider>",
    );
  }
  return ctx;
}
