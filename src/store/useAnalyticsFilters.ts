"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Idioma = "es" | "en" | "pt";
export type Alerta = "verde" | "amarillo" | "rojo" | "";

type Filters = {
  clinicaId: string;         // UUID seleccionado
  clinicaHost: string;       // para header x-clinica-host (p.ej. "localhost")
  tz: string;                // IANA
  from: string;              // ISO
  to: string;                // ISO
  cirugia?: string;
  formulario?: string;       // slug
  ab?: "A"|"B"|"";
  alerta?: Alerta;
  idioma: Idioma;
  page: number;
  pageSize: number;
};

export const useAnalyticsFilters = create<{
  filters: Filters;
  set: (p: Partial<Filters>) => void;
  setRangePreset: (preset: "24h"|"7d"|"30d") => void;
}>()(
  persist(
    (set, get) => ({
      filters: {
        clinicaId: "",
        clinicaHost: "localhost",
        tz: "America/Argentina/Cordoba",
        from: new Date(Date.now() - 24*3600*1000).toISOString(),
        to: new Date().toISOString(),
        idioma: "es",
        page: 1,
        pageSize: 20,
        ab: "",
        alerta: "",
      },
      set: (p) => set({ filters: { ...get().filters, ...p } }),
      setRangePreset: (preset) => {
        const now = new Date();
        const ms = preset === "24h" ? 24*3600e3 : preset === "7d" ? 7*86400e3 : 30*86400e3;
        set({ filters: { ...get().filters, from: new Date(+now - ms).toISOString(), to: now.toISOString(), page: 1 }});
      },
    }),
    { name: "analytics-filters" }
  )
);