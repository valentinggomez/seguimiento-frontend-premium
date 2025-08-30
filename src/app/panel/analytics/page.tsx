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
  prom?: number | null                    // promedio de la métrica elegida
  tasaRespuesta?: number | null
  tiempoPrimeraRespuestaMin?: number | null
  alertas?: { verde: number; amarillo: number; rojo: number }
  nTotal?: number
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
type Overview = { kpis: KPIs; meta?: { metric: string; groupBy: string }; series: Series }

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
/* ===================== Página ===================== */
export default function AnalyticsPage() {
  const { t, language } = useTranslation()
  const { clinica } = useClinica()

  // filtros visibles
  const [from, setFrom]   = useState<string>(new Date(Date.now() - 7 * 86400_000).toISOString())
  const [to, setTo]       = useState<string>(new Date().toISOString())
  const [alerta, setAlerta] = useState<string>('')

  // NUEVO: selector de métrica y agrupación
  const [metric, setMetric]   = useState<'dolor_24h' | 'dolor_6h' | 'satisfaccion'>('dolor_24h')
  const [groupBy, setGroupBy] = useState<'cirugia' | 'anestesia'>('cirugia')

  // estado
  const [data, setData] = useState<Overview | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)
  const [pending, setPending] = useState<boolean>(false)
  const [pendingTable, setPendingTable] = useState<boolean>(false)
  const [hasNew, setHasNew] = useState<boolean>(false)
  // Drill-down por grupo (barra clickeada)
  const [selectedGroup, setSelectedGroup] = useState<string>('')

  // Auto-refresh y sello de última actualización
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
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
    await Promise.all([loadOverview(), loadTable()])
    setLastUpdated(Date.now())
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

  // SSE con token (autenticado)
  useEffect(() => {
    if (!clinicaId) return;

    let sse: any;
    let onNew: any;

    (async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
      if (!token) return;

      const url = `${api}/api/analytics/stream?clinica_id=${encodeURIComponent(clinicaId)}`;

      // intentar cargar el polyfill; si falla, usar nativo
      let ES: any = typeof window !== 'undefined' ? (window as any).EventSource : undefined;
      try {
        const mod: any = await import('event-source-polyfill');
        ES = mod?.EventSourcePolyfill || mod?.default || ES;
      } catch {
        // nos quedamos con el nativo
      }

      // si usamos el nativo, no soporta headers -> puede dar 401
      if (ES === (window as any).EventSource) {
        sse = new ES(url);
      } else {
        sse = new ES(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onNew = () => setHasNew(true);
      sse.addEventListener?.('nueva_respuesta', onNew);
      sse.onerror = (e: any) => {
        // opcional: console.warn('SSE error', e);
      };
    })();

    return () => {
      try { sse?.removeEventListener?.('nueva_respuesta', onNew); } catch {}
      try { sse?.close?.(); } catch {}
    };
  }, [clinicaId, api]);

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
  const fmtDay = (d: string) => formatInTimeZone(new Date(d), 'UTC', 'dd MMM', { locale })

  // Totales desde las series (fallback)
  const totalRespFromSeries =
    s?.porDia?.reduce(
      (acc, d) => acc + ((d.a_verde ?? 0) + (d.a_amarillo ?? 0) + (d.a_rojo ?? 0)),
      0
    ) ?? 0;

  const totalAlertFromSeries =
    s?.porDia?.reduce(
      (acc, d) => acc + ((d.a_amarillo ?? 0) + (d.a_rojo ?? 0)),
      0
    ) ?? 0;

  // Respondidos = suma de alertas por color (si el backend lo trae) o series
  const responded = (() => {
    const fromK =
      (k?.alertas?.verde ?? 0) +
      (k?.alertas?.amarillo ?? 0) +
      (k?.alertas?.rojo ?? 0);
    return fromK > 0 ? fromK : totalRespFromSeries;
  })();

  // Enviados / universo (denominador para tasa). Probamos varias claves.
  const enviados =
    (k as any)?.nEnviados ??
    (k as any)?.nInvitados ??
    (k as any)?.nContactados ??
    k?.nTotal ??
    undefined;

  // Tasa de respuesta: si viene numérica (fracción o %) la usamos; sino: responded / enviados
  const tasaPct = (() => {
    const raw = (k?.tasaRespuesta ?? (k as any)?.tasa_respuesta) as number | undefined;
    if (typeof raw === 'number') {
      const frac = raw > 1 ? raw / 100 : raw;
      return Math.round(frac * 100);
    }
    if (typeof enviados === 'number' && enviados > 0) {
      return Math.round((responded / enviados) * 100);
    }
    return undefined; // sin denominador confiable, mostramos "—"
  })();

  // % de alertas (amarillo+rojo) sobre respondidos
  const alertPct = (() => {
    const alertsK = (k?.alertas?.amarillo ?? 0) + (k?.alertas?.rojo ?? 0);
    const alerts = alertsK > 0 ? alertsK : totalAlertFromSeries;
    if (!responded) return 0;
    return Math.round((alerts / responded) * 100);
  })();

  // textos dinámicos según métrica/agrupación
  const metricLabel = metric === 'dolor_24h' ? 'Dolor 24 h'
                    : metric === 'dolor_6h'  ? 'Dolor 6 h'
                    : 'Satisfacción'
  const groupLabel = groupBy === 'cirugia' ? 'cirugía' : 'anestesia'

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
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <span aria-live="polite">
            act. hace {Math.max(0, Math.round((Date.now() - lastUpdated) / 1000))}s
          </span>
          <button
            onClick={refreshAll}
            className="px-3 py-2 rounded-xl shadow-sm bg-[#003466] text-white hover:bg-[#002a52]"
          >
            {t('respuestas.actualizar') || 'Actualizar'}
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
        <select className="border rounded-xl px-3 py-2" value={metric} onChange={(e) => setMetric(e.target.value as any)}>
          <option value="dolor_24h">Dolor 24 h</option>
          <option value="dolor_6h">Dolor 6 h</option>
          <option value="satisfaccion">Satisfacción</option>
        </select>
        <select className="border rounded-xl px-3 py-2" value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
          <option value="cirugia">Agrupar por cirugía</option>
          <option value="anestesia">Agrupar por anestesia</option>
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
          accent={alertPct >= 60 ? C.rojo : alertPct >= 20 ? C.amarillo : C.verde}
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
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: r.nivel_alerta === 'rojo' ? '#FEE2E2'
                          : r.nivel_alerta === 'amarillo' ? '#FEF3C7' : '#DCFCE7',
                        color: r.nivel_alerta === 'rojo' ? '#B91C1C'
                          : r.nivel_alerta === 'amarillo' ? '#92400E' : '#065F46'
                      }}
                    >
                      {r.nivel_alerta ?? '-'}
                    </span>
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