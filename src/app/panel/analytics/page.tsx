'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area
} from 'recharts'
import { formatInTimeZone } from 'date-fns-tz'
import { es, enUS, ptBR } from 'date-fns/locale'
import type { Locale } from 'date-fns'           // <- asegura date-fns v2
import { useTranslation } from '@/i18n/useTranslation'
import { useClinica } from '@/lib/ClinicaProvider'
import { fetchConToken } from '@/lib/fetchConToken'
import { getAuthHeaders } from '@/lib/getAuthHeaders'

type KPIs = {
  dolorProm?: number
  satisfProm?: number
  tasaRespuesta?: number | null
  tiempoPrimeraRespuestaMin?: number | null
  alertas?: { verde: number; amarillo: number; rojo: number }
  nTotal?: number
}
type Series = {
  porCirugia?: Array<{ tipo_cirugia: string; dolor_prom: number | null; n: number }>
  porDia?: Array<{
    day: string
    dolor_prom?: number | null
    a_verde?: number
    a_amarillo?: number
    a_rojo?: number
  }>
}
type Overview = { kpis: KPIs; series: Series }

const locales: Record<string, Locale> = { es, en: enUS, pt: ptBR }
const C = { verde: '#10B981', amarillo: '#F59E0B', rojo: '#EF4444', brand: '#003466' }

function qs(params: Record<string, any>) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.set(k, String(v))
  })
  return u.toString()
}

export default function AnalyticsPage() {
  const { t, language } = useTranslation()
  const { clinica } = useClinica()

  // filtros visibles
  const [from, setFrom] = useState<string>(new Date(Date.now() - 7 * 86400_000).toISOString())
  const [to, setTo] = useState<string>(new Date().toISOString())
  const [alerta, setAlerta] = useState<string>('')

  // estado
  const [data, setData] = useState<Overview | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)
  const [pending, setPending] = useState<boolean>(false)
  const [pendingTable, setPendingTable] = useState<boolean>(false)
  const [hasNew, setHasNew] = useState<boolean>(false)

  const api = process.env.NEXT_PUBLIC_API_URL || ''
  const locale = locales[language] ?? es
  const hostHeader = typeof window !== 'undefined' ? window.location.hostname.split(':')[0] : 'localhost'
  const clinicaId = clinica?.id ?? ''

  const commonParams = useMemo(
    () => ({ clinica_id: clinicaId, from, to, alerta: alerta || undefined }),
    [clinicaId, from, to, alerta]
  )

  // load overview
  async function loadOverview() {
    if (!clinicaId) return
    try {
      setPending(true)
      const url = `/api/analytics/overview?${qs(commonParams)}`
      const r = await fetchConToken(url, { headers: { ...getAuthHeaders(), 'x-clinica-host': hostHeader } })
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

  // load table
  async function loadTable() {
    if (!clinicaId) return
    try {
      setPendingTable(true)
      const url = `/api/analytics/table?${qs({ ...commonParams, page: 1, pageSize: 20, sort: 'creado_en.desc' })}`
      const r = await fetchConToken(url, { headers: { ...getAuthHeaders(), 'x-clinica-host': hostHeader } })
      const j = await r.json()
      setRows(j?.rows || [])
      setTotal(j?.total || 0)
    } catch (e) {
      console.error('table error', e)
      setRows([])
      setTotal(0)
    } finally {
      setPendingTable(false)
    }
  }

  // first load + deps
  useEffect(() => { if (clinicaId) { loadOverview(); loadTable() } }, [clinicaId, from, to, alerta])

  // SSE
  useEffect(() => {
    if (!clinicaId) return
    const es = new EventSource(`${api}/api/analytics/stream?clinica_id=${encodeURIComponent(clinicaId)}`, { withCredentials: true })
    const onNew = () => setHasNew(true)
    es.addEventListener('respuesta_creada', onNew)
    return () => { es.removeEventListener('respuesta_creada', onNew); es.close() }
  }, [clinicaId, api])

  const k = data?.kpis
  const s = data?.series
  const fmtDay = (d: string) => formatInTimeZone(new Date(d), 'UTC', 'dd MMM', { locale })

  const alertPct = k && (k.nTotal || 0) > 0
    ? Math.round(((k.alertas?.rojo ?? 0) + (k.alertas?.amarillo ?? 0)) / (k.nTotal || 1) * 100)
    : 0

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#003466]">{t('navbar.analytics') || 'Estadísticas'}</h1>
          {hasNew && <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Nuevos</span>}
        </div>
        <button
          onClick={() => { loadOverview(); loadTable() }}
          className="px-3 py-2 rounded-xl shadow-sm bg-[#003466] text-white hover:bg-[#002a52]"
        >
          {t('respuestas.actualizar') || 'Actualizar'}
        </button>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
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
        <select className="border rounded-xl px-3 py-2" value={alerta} onChange={(e) => setAlerta(e.target.value)}>
          <option value="">{t('Alerta') || 'Alerta'}</option>
          <option value="verde">Verde</option>
          <option value="amarillo">Amarillo</option>
          <option value="rojo">Rojo</option>
        </select>

        <div className="col-span-5 flex items-center gap-2">
          <Preset onClick={() => { setFrom(new Date(Date.now() - 24 * 3600_000).toISOString()); setTo(new Date().toISOString()) }}>Últimas 24h</Preset>
          <Preset onClick={() => { setFrom(new Date(Date.now() - 7 * 86400_000).toISOString()); setTo(new Date().toISOString()) }}>Última semana</Preset>
          <Preset onClick={() => { setFrom(new Date(Date.now() - 30 * 86400_000).toISOString()); setTo(new Date().toISOString()) }}>Último mes</Preset>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi title="DOLOR PROMEDIO" value={fmt(k?.dolorProm, 1)} loading={pending} />
        <Kpi title="ALERTAS (%)" value={k ? `${alertPct}%` : '—'} loading={pending} />
        <Kpi title="TASA DE RESPUESTA" value={k ? `${Math.round((k.tasaRespuesta || 0) * 100)}%` : '—'} loading={pending} />
        <Kpi title="TIEMPO A 1ª RESPUESTA (MIN)" value={fmt(k?.tiempoPrimeraRespuestaMin, 0)} loading={pending} />
        <Kpi title="SATISFACCIÓN" value={fmt(k?.satisfProm, 1)} loading={pending} />
      </div>

      {/* Dolor por cirugía */}
      <Card title="Dolor por cirugía" loading={pending}>
        {s?.porCirugia?.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={s.porCirugia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo_cirugia" tick={{ fontSize: 12 }} interval={0} height={50} />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="dolor_prom" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </Card>

      {/* Evolución temporal */}
      <Card title="Evolución temporal" loading={pending}>
        {s?.porDia?.length ? (
          <ResponsiveContainer width="100%" height={340}>
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
              <Area type="monotone" dataKey="a_verde"   name="Alerta verde"   fill="url(#gVerde)"    stroke={C.verde} stackId="1" />
              <Area type="monotone" dataKey="a_amarillo" name="Alerta amarillo" fill="url(#gAmarillo)" stroke={C.amarillo} stackId="1" />
              <Area type="monotone" dataKey="a_rojo"    name="Alerta rojo"    fill="url(#gRojo)"     stroke={C.rojo} stackId="1" />
              <Area type="monotone" dataKey="dolor_prom" name="Dolor prom." />
            </AreaChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </Card>

      {/* Tabla */}
      <Card title={`Detalle (${total})`} loading={pendingTable}>
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

/* ---------- UI helpers ---------- */

function Kpi({ title, value, loading }: { title: string; value: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white min-h-[88px]">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">
        {loading ? <Skeleton className="h-7 w-16" /> : value || '—'}
      </div>
    </div>
  )
}
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
function fmt(n?: number | null, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toFixed(digits)
}