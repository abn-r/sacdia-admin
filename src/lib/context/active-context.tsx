"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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

export function ActiveContextProvider({ children }: { children: ReactNode }) {
  // Inicializar con null para evitar hydration mismatch (SSR-safe).
  // La hidratación desde localStorage ocurre en el useEffect de abajo.
  const [activeClubId, setActiveClubIdState] = useState<number | null>(null);
  const [activeYearId, setActiveYearIdState] = useState<number | null>(null);

  // Hidratar desde localStorage solo en el cliente
  useEffect(() => {
    const storedClub = localStorage.getItem(LS_KEY_CLUB);
    const storedYear = localStorage.getItem(LS_KEY_YEAR);

    if (storedClub !== null) {
      const parsed = parseInt(storedClub, 10);
      if (!isNaN(parsed)) setActiveClubIdState(parsed);
    }
    if (storedYear !== null) {
      const parsed = parseInt(storedYear, 10);
      if (!isNaN(parsed)) setActiveYearIdState(parsed);
    }
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
    setActiveClubIdState(id);
  }

  function setActiveYearId(id: number | null) {
    setActiveYearIdState(id);
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
