"use client";

import { useMemo } from "react";
import { useOverview, useTable } from "@/hooks/useAnalytics";
import { useAnalyticsFilters } from "@/store/useAnalyticsFilters";
import { KpiCard } from "@/components/analytics/KpiCard";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, AreaChart, Area } from "recharts";
import { formatInTimeZone } from "date-fns-tz";
import { es, enUS, ptBR } from "date-fns/locale";

const locales = { es, en: enUS, pt: ptBR };

export default function AnalyticsPage() {
  const { filters, set, setRangePreset } = useAnalyticsFilters();
  const { data, pending, hasNew, reload } = useOverview();
  const { rows, total, pending: pendingTable } = useTable();

  const t = (k: string) => {
    const dict: Record<string, Record<string,string>> = {
      es: {
        title: "Panel de Estadísticas",
        refresh: "Actualizar",
        exportCsv: "Export CSV",
        exportSheets: "Export Sheets",
        kpi_dolor: "Dolor promedio",
        kpi_alertas: "Alertas (%)",
        kpi_tasa: "Tasa de respuesta",
        kpi_tiempo: "Tiempo a 1ª respuesta (min)",
        kpi_satisf: "Satisfacción",
        newData: "Nuevos",
        noData: "No hay datos para estos filtros",
        table: "Detalle",
      },
      en: {
        title: "Analytics",
        refresh: "Refresh",
        exportCsv: "Export CSV",
        exportSheets: "Export Sheets",
        kpi_dolor: "Avg. pain",
        kpi_alertas: "Alerts (%)",
        kpi_tasa: "Response rate",
        kpi_tiempo: "Time to first response (min)",
        kpi_satisf: "Satisfaction",
        newData: "New",
        noData: "No data for filters",
        table: "Details",
      },
      pt: {
        title: "Estatísticas",
        refresh: "Atualizar",
        exportCsv: "Exportar CSV",
        exportSheets: "Exportar Sheets",
        kpi_dolor: "Dor média",
        kpi_alertas: "Alertas (%)",
        kpi_tasa: "Taxa de resposta",
        kpi_tiempo: "Tempo até 1ª resposta (min)",
        kpi_satisf: "Satisfação",
        newData: "Novos",
        noData: "Sem dados para os filtros",
        table: "Detalhe",
      },
    };
    return dict[filters.idioma][k] ?? k;
  };

  const locale = locales[filters.idioma];
  const fmtDay = (d: string) => formatInTimeZone(new Date(d), filters.tz, "dd MMM", { locale });

  const k = data?.kpis;
  const s = data?.series;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
  const commonQs = `clinica_id=${filters.clinicaId}&from=${filters.from}&to=${filters.to}`;
  const headers = { "x-clinica-host": filters.clinicaHost };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b flex flex-wrap items-center justify-between gap-3 p-3 rounded-b-xl">
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold tracking-tight">{t("title")}</div>
          {hasNew && <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">{t("newData")}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reload} className="px-3 py-2 rounded-xl shadow-sm bg-slate-900 text-white hover:opacity-90">
            {t("refresh")}
          </button>
          {/* Export buttons: CSV y Sheets */}
          <a
            className="px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50"
            href={`${apiBase}/api/analytics/export?format=csv&${commonQs}`}
            onClick={(e)=>{ if(!filters.clinicaId){ e.preventDefault(); alert("Seleccioná clinicaId"); } }}
          >{t("exportCsv")}</a>
          <button
            className="px-3 py-2 rounded-xl border shadow-sm hover:bg-slate-50"
            onClick={async ()=>{
              if (!filters.clinicaId) return alert("Seleccioná clinicaId");
              const r = await fetch(`${apiBase}/api/analytics/export?format=sheets&${commonQs}`, { headers, credentials: "include" });
              const j = await r.json();
              if (j?.spreadsheetUrl) window.open(j.spreadsheetUrl, "_blank");
              else alert("Export a Sheets enviado");
            }}
          >{t("exportSheets")}</button>
        </div>
      </div>

      {/* Filtros básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        <input className="border rounded-xl px-3 py-2" placeholder="Clinica UUID"
          value={filters.clinicaId} onChange={(e)=>set({ clinicaId: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" placeholder="Clinica host"
          value={filters.clinicaHost} onChange={(e)=>set({ clinicaHost: e.target.value })} />
        <input className="border rounded-xl px-3 py-2" type="datetime-local"
          value={filters.from.slice(0,16)} onChange={(e)=>set({ from: new Date(e.target.value).toISOString(), page:1 })}/>
        <input className="border rounded-xl px-3 py-2" type="datetime-local"
          value={filters.to.slice(0,16)} onChange={(e)=>set({ to: new Date(e.target.value).toISOString(), page:1 })}/>
        <select className="border rounded-xl px-3 py-2" value={filters.idioma} onChange={(e)=>set({ idioma: e.target.value as any })}>
          <option value="es">ES</option><option value="en">EN</option><option value="pt">PT</option>
        </select>
        <select className="border rounded-xl px-3 py-2" value={filters.ab} onChange={(e)=>set({ ab: e.target.value as any })}>
          <option value="">A/B</option><option value="A">A</option><option value="B">B</option>
        </select>
        <select className="border rounded-xl px-3 py-2" value={filters.alerta} onChange={(e)=>set({ alerta: e.target.value as any })}>
          <option value="">Alerta</option><option value="verde">Verde</option><option value="amarillo">Amarillo</option><option value="rojo">Rojo</option>
        </select>

        <div className="col-span-1 sm:col-span-2 lg:col-span-7 flex items-center gap-2">
          <button className="border rounded-xl px-3 py-2" onClick={()=>setRangePreset("24h")}>Últimas 24h</button>
          <button className="border rounded-xl px-3 py-2" onClick={()=>setRangePreset("7d")}>Última semana</button>
          <button className="border rounded-xl px-3 py-2" onClick={()=>setRangePreset("30d")}>Último mes</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard title={t("kpi_dolor")}  value={k?.dolorProm?.toFixed?.(1) ?? "-"} />
        <KpiCard title={t("kpi_alertas")} value={k ? Math.round(((k.alertas.amarillo+k.alertas.rojo)/(k.nTotal||1))*100)+"%" : "-"} />
        <KpiCard title={t("kpi_tasa")}    value={k ? Math.round((k.tasaRespuesta||0)*100)+"%" : "-"} />
        <KpiCard title={t("kpi_tiempo")}  value={k?.tiempoPrimeraRespuestaMin?.toFixed?.(0) ?? "-"} />
        <KpiCard title={t("kpi_satisf")}  value={k?.satisfProm?.toFixed?.(1) ?? "-"} />
      </div>

      {/* Gráfico: Dolor por cirugía */}
      <Card title="Dolor por cirugía">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={s?.porCirugia || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tipo_cirugia" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="dolor_prom" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico: Evolución temporal */}
      <Card title="Evolución temporal">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={(s?.porDia || []).map((d:any)=>({ ...d, dayLabel: fmtDay(d.day) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dayLabel" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="dolor_prom" />
            <Area type="monotone" dataKey="a_verde" stackId="1" />
            <Area type="monotone" dataKey="a_amarillo" stackId="1" />
            <Area type="monotone" dataKey="a_rojo" stackId="1" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabla simple */}
      <Card title={t("table")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <Th>Fecha</Th><Th>Cirugía</Th><Th>Alerta</Th><Th>Dolor</Th><Th>Satisf.</Th>
              </tr>
            </thead>
            <tbody>
              {pendingTable ? (
                <tr><td className="py-6 text-center text-slate-500" colSpan={5}>Cargando…</td></tr>
              ) : rows.length ? rows.map((r:any)=>(
                <tr key={r.id} className="border-b last:border-0">
                  <Td>{new Date(r.creado_en).toLocaleString()}</Td>
                  <Td>{r.tipo_cirugia ?? "-"}</Td>
                  <Td>{r.nivel_alerta ?? "-"}</Td>
                  <Td>{r.dolor ?? "-"}</Td>
                  <Td>{r.satisfaccion ?? "-"}</Td>
                </tr>
              )) : (
                <tr><td className="py-6 text-center text-slate-500" colSpan={5}>{t("noData")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between pt-3">
          <span className="text-xs text-slate-500">Total: {total}</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border rounded-lg" onClick={()=>set({ page: Math.max(1, filters.page-1) })} disabled={filters.page<=1}>Prev</button>
            <span className="text-xs">Page {filters.page}</span>
            <button className="px-3 py-1 border rounded-lg" onClick={()=>set({ page: filters.page+1 })} disabled={rows.length < filters.pageSize}>Next</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-2xl border shadow-sm bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Th({ children }: any) { return <th className="py-2 pr-3">{children}</th>; }
function Td({ children }: any) { return <td className="py-2 pr-3">{children}</td>; }