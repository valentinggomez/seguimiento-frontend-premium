"use client";

import { useEffect, useMemo, useState } from "react";
import { useAnalyticsFilters } from "@/store/useAnalyticsFilters";

const API = process.env.NEXT_PUBLIC_API_URL || "";

function qs(params: Record<string,string|number|boolean|undefined>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== "") u.set(k, String(v));
  });
  return u.toString();
}

export function useOverview() {
  const { filters } = useAnalyticsFilters();
  const [data, setData] = useState<any>(null);
  const [pending, setPending] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const headers = useMemo(() => ({ "x-clinica-host": filters.clinicaHost }), [filters.clinicaHost]);

  async function load() {
    setPending(true);
    const query = qs({
      clinica_id: filters.clinicaId,
      from: filters.from,
      to: filters.to,
      cirugia: filters.cirugia,
      formulario: filters.formulario,
      ab: filters.ab,
      alerta: filters.alerta,
      idioma: filters.idioma
    });
    const r = await fetch(`${API}/api/analytics/overview?${query}`, { headers, credentials: "include" });
    const j = await r.json();
    setData(j);
    setPending(false);
    setHasNew(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters)]);

  useEffect(() => {
    if (!filters.clinicaId) return;

    // 🎯 igual que en Respuestas: resolvemos host para withClinica
    const host =
      typeof window !== 'undefined'
        ? window.location.hostname.split(':')[0].toLowerCase().trim()
        : '';

    const url = `${API}/api/sse?clinica_id=${encodeURIComponent(filters.clinicaId)}&host=${encodeURIComponent(host)}&ts=${Date.now()}`;

    const es = new EventSource(url); // sin headers
    const onMsg = (ev: MessageEvent) => {
      try {
        const d = JSON.parse(ev.data);
        if (d?.tipo === 'nueva_respuesta') setHasNew(true);
      } catch {}
    };
    es.addEventListener('message', onMsg as any);
    return () => { es.removeEventListener('message', onMsg as any); es.close(); };
  }, [filters.clinicaId]);

  return { data, pending, hasNew, reload: load };
}

export function useTable() {
  const { filters } = useAnalyticsFilters();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(false);
  const headers = useMemo(() => ({ "x-clinica-host": filters.clinicaHost }), [filters.clinicaHost]);

  async function load() {
    setPending(true);
    const query = qs({
      clinica_id: filters.clinicaId,
      from: filters.from,
      to: filters.to,
      cirugia: filters.cirugia,
      formulario: filters.formulario,
      ab: filters.ab,
      alerta: filters.alerta,
      page: filters.page,
      pageSize: filters.pageSize,
      sort: "creado_en.desc",
    });
    const r = await fetch(`${API}/api/analytics/table?${query}`, { headers, credentials: "include" });
    const j = await r.json();
    setRows(j.rows || []);
    setTotal(j.total || 0);
    setPending(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters)]);

  return { rows, total, pending, reload: load };
}