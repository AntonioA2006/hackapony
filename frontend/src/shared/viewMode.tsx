import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { isCrew, isOperator, isSupervisor } from "./roles";

/**
 * Vista activa. Cada rol tiene la suya; supervisión puede entrar como ciudadano, operador o cuadrilla
 * y cambiar de vista sin cerrar sesión (se recuerda en la pestaña con sessionStorage).
 */
export type View = "ciudadano" | "operador" | "cuadrilla";
const KEY = "aa_view";

const read = (): View | null => {
  const v = sessionStorage.getItem(KEY);
  return v === "ciudadano" || v === "operador" || v === "cuadrilla" ? v : null;
};

type Ctx = { chosen: View | null; choose: (v: View | null) => void };
const ViewContext = createContext<Ctx | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<View | null>(read);
  const choose = useCallback((v: View | null) => {
    if (v) sessionStorage.setItem(KEY, v);
    else sessionStorage.removeItem(KEY);
    setChosen(v);
  }, []);
  return <ViewContext.Provider value={{ chosen, choose }}>{children}</ViewContext.Provider>;
}

/** Vista efectiva para el rol: solo supervisión puede elegir; el resto tiene la de su rol. */
export function viewFor(role: string | null | undefined, chosen: View | null): View {
  if (isSupervisor(role)) return chosen ?? "operador";
  if (isCrew(role)) return "cuadrilla";
  if (isOperator(role)) return "operador";
  return "ciudadano";
}

export const VIEW_HOME: Record<View, string> = { ciudadano: "/tablero", operador: "/panel", cuadrilla: "/cuadrilla" };

export function useView() {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error("useView outside provider");
  return ctx;
}
