'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area, Cell, LineChart, Line
} from 'recharts'
import { formatInTimeZone } from 'date-fns-tz'
import { es, enUS, ptBR } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { useTranslation } from '@/i18n/useTranslation'
import { useClinica } from '@/lib/ClinicaProvider'
import { fetchConToken } from '@/lib/fetchConToken'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { KpiCard } from '@/components/analytics/KpiCard'

/* ===================== Tipos (alineados al nuevo backend) ===================== */
type KPIs = {
  prom?: number | null
  tasaRespuesta?: number | null   // fracción 0–1 (o % si en el futuro la cambias)
  tiempoPrimeraRespuestaMin?: number | null
  alertas?: { verde: number; amarillo: number; rojo: number }
  nTotal?: number
  nEnviados?: number
  alertPct?: number               // % ya calculado en backend
}

type Series = {
  porGrupo?: Array<{ grupo: string; val_prom: number | null; n: number }>
  porDia?: Array<{
    day: string
    val_prom?: number | null
    a_verde?: number
    a_amarillo?: number
    a_rojo?: number
  }>
}

type Meta = {
  metric: string
  groupBy: string
  metrics?: Array<{ slug: string; label: string; enabled: boolean; sample?: number }>
  groups?:  Array<{ slug: string; label: string; enabled: boolean }>
}

type Overview = { kpis: KPIs; meta?: Meta; series: Series }

/* ===================== Constantes UI ===================== */
const locales: Record<string, Locale> = { es, en: enUS, pt: ptBR }
const C = { verde: '#10B981', amarillo: '#F59E0B', rojo: '#EF4444', brand: '#003466' }
const PALETTE = [
  '#4F46E5', '#22C55E', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6', '#E11D48', '#10B981',
  '#F97316', '#0EA5E9', '#84CC16', '#F43F5E'
]

/* Helpers */
function qs(params: Record<string, any>) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.set(k, String(v))
  })
  return u.toString()
}
function fmt(n?: number | null, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toFixed(digits)
}

function toCSV(rows: any[]) {
  if (!rows?.length) return ''
  const cols = ['creado_en','tipo_cirugia','nivel_alerta','dolor','satisfaccion']
  const header = cols.join(',')
  const body = rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(',')).join('\n')
  return `${header}\n${body}`
}
function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const normNivel = (v: any): 'rojo' | 'amarillo' | 'verde' | null => {
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'rojo' || s === 'amarillo' || s === 'verde' ? (s as any) : null
}

/* ===================== Página ===================== */
export default function AnalyticsPage() {
  const { t, language } = useTranslation()
  const { clinica } = useClinica()

  // filtros visibles
  const [from, setFrom]   = useState<string>(new Date(Date.now() - 7 * 86400_000).toISOString())
  const [to, setTo]       = useState<string>(new Date().toISOString())
  const [alerta, setAlerta] = useState<string>('')

  // NUEVO: selector de métrica y agrupación
  const [metric, setMetric]   = useState<string>('') 
  const [groupBy, setGroupBy] = useState<string>('') 

  // estado
  const [data, setData] = useState<Overview | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)
  const [pending, setPending] = useState<boolean>(false)
  const [pendingTable, setPendingTable] = useState<boolean>(false)
  const [hasNew, setHasNew] = useState<boolean>(false)
  // Drill-down por grupo (barra clickeada)
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  // tic de 1s para re-renderizar el indicador
  const [nowTs, setNowTs] = useState<number>(Date.now())
  // periodo de auto-refresh (el que ya usás en el setInterval)
  const AUTO_MS = 90_000

  // Auto-refresh y sello de última actualización
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  const [refreshState, setRefreshState] = useState<'idle'|'loading'|'done'>('idle')

  const api = process.env.NEXT_PUBLIC_API_URL || ''
  const locale = locales[language] ?? es
  const hostHeader = typeof window !== 'undefined' ? window.location.hostname.split(':')[0] : 'localhost'
  const clinicaId = clinica?.id ?? ''

  const commonParams = useMemo(
    () => ({
      clinica_id: clinicaId,
      from, to,
      alerta: alerta || undefined,   // ← único parámetro
      metric, groupBy,
      groupValue: selectedGroup || undefined,
    }),
    [clinicaId, from, to, alerta, metric, groupBy, selectedGroup]
  )

  // load overview
  async function loadOverview() {
    if (!clinicaId) return
    try {
      setPending(true)
      const url = `/api/analytics/overview?${qs(commonParams)}`
      const r = await fetchConToken(url, { headers: { ...getAuthHeaders(), 'x-clinica-host': hostHeader } })
      if (!r.ok) {
        console.error('overview status', r.status);
      }
      const j = await r.json()
      setData(j)
    } catch (e) {
      console.error('overview error', e)
      setData(null)
    } finally {
      setPending(false)
      setHasNew(false)
    }
  }

  // load table (por ahora se mantiene igual; muestra dolor/satisf.)
  async function loadTable() {
    if (!clinicaId) return
    try {
      setPendingTable(true)
      const url = `/api/analytics/table?${qs({ ...commonParams, page: 1, pageSize: 20, sort: 'creado_en.desc' })}`
      const r = await fetchConToken(url, { headers: { ...getAuthHeaders(), 'x-clinica-host': hostHeader } })
      let j: any
      try { j = await r.json() } catch { j = { raw: await r.text() } }
      if (!r.ok) {
        console.error('table status', r.status, j)
        setRows([]); setTotal(0)
        return
      }
      setRows(j?.rows || []); setTotal(j?.total || 0)
    } catch (e) {
      console.error('table error', e)
      setRows([]); setTotal(0)
    } finally {
      setPendingTable(false)
    }
  }

  async function refreshAll() {
    try {
      setRefreshState('loading')
      await Promise.all([loadOverview(), loadTable()])
      setLastUpdated(Date.now())
      setRefreshState('done')
      // volver a "idle" luego de un ratito
      setTimeout(() => setRefreshState('idle'), 1500)
    } catch {
      // si algo falla, igual salimos de loading
      setRefreshState('idle')
    }
  }

  // first load + deps
  useEffect(() => {
    if (clinicaId) { refreshAll() }
  }, [clinicaId, from, to, alerta, metric, groupBy, selectedGroup])

  useEffect(() => {
    if (!autoRefresh || !clinicaId) return
    const id = setInterval(() => refreshAll(), 90_000) // 90s
    return () => clearInterval(id)
  }, [autoRefresh, clinicaId])

  // SSE con token (autenticado) — usa el mismo bus que Respuestas
  useEffect(() => {
    let es: EventSource | null = null;

    (async () => {
      try {
        // 1) obtener clinica_id por host actual (como en Respuestas)
        const host =
          typeof window !== 'undefined'
            ? window.location.hostname.split(':')[0].toLowerCase().trim()
            : '';
        const resClin = await fetchConToken(`/api/clinicas/clinica?host=${encodeURIComponent(host)}`);
        const dataClin = await resClin.json();
        const clinicaId = dataClin?.clinica?.id || '';
        if (!clinicaId) return;

        // 2) URL ABSOLUTA al backend del bus SSE
        const apiBase = process.env.NEXT_PUBLIC_API_URL;
        const hostParam =
          typeof window !== 'undefined'
            ? window.location.hostname.split(':')[0].toLowerCase().trim()
            : '';

        const sseUrl = `${apiBase}/api/sse?clinica_id=${encodeURIComponent(clinicaId)}&host=${encodeURIComponent(hostParam)}&ts=${Date.now()}`;

        // 3) abrir EventSource (sin headers; el bus no los necesita)
        es = new EventSource(sseUrl);

        const onMsg = (ev: MessageEvent) => {
          try {
            const d = JSON.parse(ev.data);
            // El bus publica: { tipo: 'nueva_respuesta', payload: {...} }
            if (d?.tipo === 'nueva_respuesta') {
              setHasNew(true);   // muestra el badge “Nuevos”
            }
          } catch {}
        };

        es.addEventListener('message', onMsg as any);
        es.addEventListener('ready', () => {/* opcional */});
        es.onerror = () => {/* el browser reintenta (retry:10000) */};

        // cleanup
        return () => {
          if (!es) return;
          es.removeEventListener('message', onMsg as any);
          try { es.close(); } catch {}
          es = null;
        };
      } catch {
        // si falla, no abrimos SSE
      }
    })();

    return () => {
      try { es?.close(); } catch {}
    };
  }, []);

  // Restaurar filtros desde la URL al montar
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const g = (k: string) => q.get(k) || ''
    const f = g('from'); if (f) setFrom(new Date(f).toISOString())
    const tt = g('to');  if (tt) setTo(new Date(tt).toISOString())
    const a = g('alerta'); if (a) setAlerta(a)
    const m = g('metric') as any; if (m) setMetric(m)
    const gb = g('groupBy') as any; if (gb) setGroupBy(gb)
    const gv = g('groupValue'); if (gv) setSelectedGroup(gv)
  }, [])

  // Sincronizar filtros hacia la URL
  useEffect(() => {
    const params = qs({ from, to, alerta, metric, groupBy, groupValue: selectedGroup || undefined })
    const url = `${location.pathname}?${params}`
    window.history.replaceState(null, '', url)
  }, [from, to, alerta, metric, groupBy, selectedGroup])

  const k = data?.kpis
  const s = data?.series

  // Mostrar todas; el option se deshabilita si enabled=false
  const metricsList = data?.meta?.metrics ?? []
  const groupsList  = data?.meta?.groups  ?? []

  // Normalizar selección con las listas que vienen en meta
  useEffect(() => {
    const mm = data?.meta?.metrics ?? []
    const gm = data?.meta?.groups  ?? []

    if (mm.length) {
      const enabled = mm.filter(m => m.enabled !== false).map(m => m.slug)
      const wanted  = data?.meta?.metric
      const next    = enabled.includes(wanted!) ? wanted! : enabled[0]
      if (next && metric !== next) setMetric(next)
    }
    if (gm.length) {
      const enabledG = gm.filter(g => g.enabled !== false).map(g => g.slug)
      const wantedG  = data?.meta?.groupBy
      const nextG    = enabledG.includes(wantedG!) ? wantedG! : enabledG[0]
      if (nextG && groupBy !== nextG) setGroupBy(nextG)
    }
  }, [data?.meta?.metric, data?.meta?.groupBy, data?.meta?.metrics, data?.meta?.groups])

  useEffect(() => {
    let id: any;

    const start = () => {
      if (document.visibilityState === 'visible') {
        id = setInterval(() => setNowTs(Date.now()), 1000);
      }
    };
    const stop = () => { if (id) clearInterval(id); id = null; };

    start();
    const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
    document.addEventListener('visibilitychange', onVis);

    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const fmtDay = (d: string) => formatInTimeZone(new Date(d), 'UTC', 'dd MMM', { locale })


  // Tasa: viene como fracción 0–1 (o % en el futuro). Normalizamos a % entero.
  const tasaPct = ((): number | undefined => {
    if (typeof k?.tasaRespuesta === 'number') {
      const frac = k.tasaRespuesta > 1 ? k.tasaRespuesta / 100 : k.tasaRespuesta
      return Math.round(frac * 100)
    }
    return undefined
  })()

  // % de alertas: lo trae el backend listo; si no, fallback a 0
  const alertPct = typeof k?.alertPct === 'number' ? k.alertPct : 0

  const humanize = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  // textos dinámicos según métrica/agrupación
  const metricLabel =
    data?.meta?.metrics?.find(m => m.slug === metric)?.label
    ?? humanize(metric || '')

  const groupLabel =
    data?.meta?.groups?.find(g => g.slug === groupBy)?.label
    ?? humanize(groupBy || '')

  const kpiHelp = {
    prom:
      metric === 'satisfaccion'
        ? 'Promedio de satisfacción (0–10) en el período seleccionado.'
        : `Promedio de ${metricLabel.toLowerCase()} en el período seleccionado.`,
    alertas: 'Porcentaje de respuestas con alerta amarilla o roja.',
    tasa: 'Porcentaje de pacientes que respondieron al seguimiento.',
    satisfaccion: 'Promedio de satisfacción (0–10).',
  }

  const accentForPct = (pct: number) =>
    pct >= 60 ? C.rojo : pct >= 20 ? C.amarillo : C.verde

  const alertAccent = accentForPct(alertPct)

  const secsSince = Math.max(0, Math.floor((nowTs - lastUpdated) / 1000));
  const secsToNext = autoRefresh
    ? Math.max(0, Math.ceil((AUTO_MS - ((nowTs - lastUpdated) % AUTO_MS)) / 1000))
    : null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#003466]">{t('navbar.analytics') || 'Estadísticas'}</h1>
          {hasNew && <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Nuevos</span>}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>

          <span aria-live="polite" className="whitespace-nowrap">
            act. hace <b>{secsSince}</b>s
            {autoRefresh && <> · próx. en <b>{secsToNext}</b>s</>}
          </span>

          <button
            onClick={refreshAll}
            className="px-3 py-2 rounded-xl shadow-sm bg-[#003466] text-white hover:bg-[#002a52] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            disabled={refreshState === 'loading'}
            aria-live="polite"
            title={refreshState === 'done' ? `Actualizado hace ${secsSince}s` : undefined}
          >
            {refreshState === 'loading' && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity=".25"/>
                <path d="M22 12a10 10 0 0 1-10 10" fill="currentColor"/>
              </svg>
            )}
            {refreshState === 'done' && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {refreshState === 'loading'
              ? 'Actualizando…'
              : refreshState === 'done'
                ? 'Actualizado'
                : (t('respuestas.actualizar') || 'Actualizar')}
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
        <input
          className="border rounded-xl px-3 py-2 col-span-2"
          type="datetime-local"
          value={from.slice(0, 16)}
          onChange={(e) => setFrom(new Date(e.target.value).toISOString())}
        />
        <input
          className="border rounded-xl px-3 py-2 col-span-2"
          type="datetime-local"
          value={to.slice(0, 16)}
          onChange={(e) => setTo(new Date(e.target.value).toISOString())}
        />
        <select
          className="border rounded-xl px-3 py-2"
          value={alerta}
          onChange={(e) => setAlerta((e.target.value || '').trim().toLowerCase())}
        >
          <option value="">{t('Alerta') || 'Alerta'}</option>
          <option value="verde">Verde</option>
          <option value="amarillo">Amarillo</option>
          <option value="rojo">Rojo</option>
        </select>
        {/* NUEVO: Métrica + Agrupar por */}
        <select
          className="border rounded-xl px-3 py-2"
          value={metric}
          onChange={(e) => setMetric(e.target.value as any)}
        >
          {(!data?.meta?.metrics || !data.meta.metrics.length) && (
            <option value="" disabled>Cargando métricas…</option>
          )}
          {(data?.meta?.metrics ?? []).map(m => (
            <option
              key={m.slug}
              value={m.slug}
              // siempre seleccionables; el backend decide enabled/strict
              title={m.sample === 0 ? 'Sin datos en el rango' : (m.sample != null ? `Muestras: ${m.sample}` : undefined)}
            >
              {(m.label || humanize(m.slug)) + (m.sample != null ? ` (${m.sample})` : '') + (m.sample === 0 ? ' — sin datos' : '')}
            </option>
          ))}
        </select>

        <select
          className="border rounded-xl px-3 py-2"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as any)}
        >
          {(!data?.meta?.groups || !data.meta.groups.length) && (
            <option value="" disabled>Cargando agrupaciones…</option>
          )}
          {(data?.meta?.groups ?? []).map(g => (
            <option key={g.slug} value={g.slug}>
              {g.label || humanize(g.slug)}
            </option>
          ))}
        </select>

        <div className="col-span-7 flex items-center gap-2">
          <Preset onClick={() => { setFrom(new Date(Date.now() - 24 * 3600_000).toISOString()); setTo(new Date().toISOString()) }}>Últimas 24h</Preset>
          <Preset onClick={() => { setFrom(new Date(Date.now() - 7 * 86400_000).toISOString()); setTo(new Date().toISOString()) }}>Última semana</Preset>
          <Preset onClick={() => { setFrom(new Date(Date.now() - 30 * 86400_000).toISOString()); setTo(new Date().toISOString()) }}>Último mes</Preset>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title={`${metricLabel.toUpperCase()} PROMEDIO`}
          value={fmt(k?.prom, metric === 'satisfaccion' ? 1 : 1)}
          help={kpiHelp.prom}
          accent={C.brand}
          loading={pending}
          spark={<KpiSpark data={s?.porDia} dataKey="val_prom" />}
        />

        <KpiCard
          title="ALERTAS (%)"
          value={`${alertPct}%`}
          help={kpiHelp.alertas}
          accent={alertAccent}
          loading={pending}
        />

        <KpiCard
          title="TASA DE RESPUESTA"
          value={tasaPct == null ? '—' : `${tasaPct}%`}
          help={kpiHelp.tasa}
          accent={tasaPct == null ? C.brand : (tasaPct >= 70 ? C.verde : tasaPct >= 40 ? C.amarillo : C.rojo)}
          loading={pending}
        />

        <KpiCard
          title="SATISFACCIÓN"
          value={metric !== 'satisfaccion' ? '—' : fmt(k?.prom, 1)}
          help={kpiHelp.satisfaccion}
          accent={C.brand}
          loading={pending}
        />
      </div>

      {/* Barras por grupo */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>{`Promedio por ${groupLabel}`}</span>
            {selectedGroup && (
              <button
                onClick={() => setSelectedGroup('')}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200"
                title="Quitar filtro"
              >
                {groupLabel}: <b>{selectedGroup}</b> ✕
              </button>
            )}
          </div>
        }
        loading={pending}
      >
        {s?.porGrupo?.length ? (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={s.porGrupo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="grupo" tick={{ fontSize: 12 }} interval={0} height={50} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="val_prom" name={`${metricLabel.toLowerCase()} prom.`} radius={[6, 6, 0, 0]}>
                {s.porGrupo.map((row, i) => (
                  <Cell
                    key={i}
                    fill={PALETTE[i % PALETTE.length]}
                    cursor="pointer"
                    onClick={() => setSelectedGroup(row.grupo)}
                    stroke={selectedGroup === row.grupo ? '#111827' : undefined}
                    strokeWidth={selectedGroup === row.grupo ? 2 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </Card>

      {/* Evolución temporal */}
      <Card title="Evolución temporal" loading={pending}>
        {s?.porDia?.length ? (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={s.porDia.map(d => ({ ...d, dayLabel: fmtDay(d.day) }))}>
              <defs>
                <linearGradient id="gVerde" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.verde} stopOpacity={0.5}/>
                  <stop offset="95%" stopColor={C.verde} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="gAmarillo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.amarillo} stopOpacity={0.5}/>
                  <stop offset="95%" stopColor={C.amarillo} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="gRojo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.rojo} stopOpacity={0.5}/>
                  <stop offset="95%" stopColor={C.rojo} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dayLabel" />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Legend />
              <Area type="monotone" dataKey="a_verde"    name="Alerta verde"    fill="url(#gVerde)"    stroke={C.verde} stackId="1" />
              <Area type="monotone" dataKey="a_amarillo" name="Alerta amarillo" fill="url(#gAmarillo)" stroke={C.amarillo} stackId="1" />
              <Area type="monotone" dataKey="a_rojo"     name="Alerta rojo"     fill="url(#gRojo)"     stroke={C.rojo} stackId="1" />
              {/* línea de la métrica elegida */}
              <Area type="monotone" dataKey="val_prom"   name={`${metricLabel.toLowerCase()} prom.`} stroke={C.brand} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </Card>

      {/* Tabla (igual por ahora) */}
      <Card title={`Detalle (${total})`} loading={pendingTable}>
        <div className="flex justify-end mb-2">
          <button
            onClick={() => download(
              `detalle_${new Date(from).toISOString()}_${new Date(to).toISOString()}.csv`,
              toCSV(rows)
            )}
            className="text-xs px-3 py-1 rounded border hover:bg-slate-50"
          >
            Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <Th>Fecha</Th><Th>Cirugía</Th><Th>Alerta</Th><Th>Dolor</Th><Th>Satisf.</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0">
                  <Td>{new Date(r.creado_en).toLocaleString()}</Td>
                  <Td>{r.tipo_cirugia ?? '-'}</Td>
                  <Td>
                    {(() => {
                      const nivel = normNivel(r.nivel_alerta)
                      const styles =
                        nivel === 'rojo'
                          ? { bg: '#FEE2E2', fg: '#B91C1C', label: 'rojo' }
                          : nivel === 'amarillo'
                            ? { bg: '#FEF3C7', fg: '#92400E', label: 'amarillo' }
                            : nivel === 'verde'
                              ? { bg: '#DCFCE7', fg: '#065F46', label: 'verde' }
                              // ⬇️ sin nivel → badge gris (no lo pintes de verde)
                              : { bg: '#E5E7EB', fg: '#374151', label: '—' }

                      return (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: styles.bg, color: styles.fg }}
                        >
                          {styles.label}
                        </span>
                      )
                    })()}
                  </Td>
                  <Td>{r.dolor ?? '-'}</Td>
                  <Td>{r.satisfaccion ?? '-'}</Td>
                </tr>
              )) : (
                <tr><td className="py-6 text-center text-slate-500" colSpan={5}>No hay datos para estos filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function KpiSpark({ data, dataKey='val_prom' }: { data?: any[]; dataKey?: string }) {
  if (!data?.length) return null
  return (
    <div className="mt-1">
      <ResponsiveContainer width="100%" height={34}>
        <LineChart data={data}>
          <Line type="monotone" dataKey={dataKey} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- UI helpers ---------- */
function Card({ title, children, loading }: any) {
  return (
    <div className="rounded-2xl border shadow-sm bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{title}</div>
        {loading ? <Skeleton className="h-4 w-24" /> : null}
      </div>
      {children}
    </div>
  )
}
function Preset({ children, onClick }: any) {
  return <button onClick={onClick} className="px-3 py-2 rounded-xl border shadow-sm bg-white hover:bg-slate-50">{children}</button>
}
function Th({ children }: any) { return <th className="py-2 pr-3">{children}</th> }
function Td({ children }: any) { return <td className="py-2 pr-3">{children}</td> }
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}
function Empty() {
  return <div className="h-[260px] flex items-center justify-center text-slate-500">No hay datos para estos filtros</div>
}