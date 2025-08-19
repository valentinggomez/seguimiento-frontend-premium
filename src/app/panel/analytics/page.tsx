'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area
} from 'recharts'
import { formatInTimeZone } from 'date-fns-tz'
import { es, enUS, ptBR } from 'date-fns/locale'
import { useTranslation } from '@/i18n/useTranslation'
import { useClinica } from '@/lib/ClinicaProvider'
import { fetchConToken } from '@/lib/fetchConToken'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import type { Locale } from 'date-fns'

type KPIs = {
  dolorProm?: number
  satisfProm?: number
  tasaRespuesta?: number
  tiempoPrimeraRespuestaMin?: number
  alertas?: { verde: number; amarillo: number; rojo: number }
  nTotal?: number
}
type Series = {
  porCirugia?: Array<{ tipo_cirugia: string; dolor_prom: number; n: number }>
  porDia?: Array<{
    day: string
    dolor_prom?: number
    a_verde?: number
    a_amarillo?: number
    a_rojo?: number
  }>
}
type Overview = { kpis: KPIs; series: Series }

const locales: Record<string, Locale> = { es, en: enUS, pt: ptBR }

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

  const [clinicaId, setClinicaId] = useState<string>('')
  const [tz, setTz] = useState<string>('America/Argentina/Cordoba')

  const [from, setFrom] = useState<string>(new Date(Date.now() - 24 * 3600_000).toISOString())
  const [to, setTo] = useState<string>(new Date().toISOString())
  const [alerta, setAlerta] = useState<string>('')

  const [data, setData] = useState<Overview | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState<number>(0)
  const [pending, setPending] = useState<boolean>(false)
  const [pendingTable, setPendingTable] = useState<boolean>(false)
  const [hasNew, setHasNew] = useState<boolean>(false)

  const api = process.env.NEXT_PUBLIC_API_URL || ''
  const locale = locales[language] ?? es
  const hostHeader = typeof window !== 'undefined' ? window.location.hostname.split(':')[0] : 'localhost'

  // Inicializar desde Provider (mismo patrón que respuestas)
  useEffect(() => {
    if (clinica?.id) setClinicaId(clinica.id)
    if ((clinica as any)?.tz) setTz((clinica as any).tz)
  }, [clinica?.id])

  const commonParams = useMemo(
    () => ({
      clinica_id: clinicaId,
      from,
      to,
      alerta: alerta || undefined,
    }),
    [clinicaId, from, to, alerta]
  )

  // Cargar KPIs + series
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

  // Cargar tabla
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

  // Primer load + cuando cambian filtros
  useEffect(() => {
    if (!clinicaId) return
    loadOverview()
    loadTable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaId, from, to, alerta])

  // SSE “nuevos” (igual patrón que respuestas)
  useEffect(() => {
    if (!clinicaId) return
    const esrc = new EventSource(`${api}/api/analytics/stream?clinica_id=${encodeURIComponent(clinicaId)}`, { withCredentials: true })
    const onNew = () => setHasNew(true)
    esrc.addEventListener('respuesta_creada', onNew)
    return () => { esrc.removeEventListener('respuesta_creada', onNew); esrc.close() }
  }, [clinicaId, api])

  // helpers
  const k = data?.kpis
  const s = data?.series
  const fmtDay = (d: string) => formatInTimeZone(new Date(d), tz, 'dd MMM', { locale })

  const alertPct = k && k.nTotal! > 0
    ? Math.round(((k.alertas?.rojo ?? 0) + (k.alertas?.amarillo ?? 0)) / (k.nTotal || 1) * 100)
    : 0

  return (
    <div className="p-6">
      {/* Header (mismo look & feel que respuestas) */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-[#003366]">{t('navbar.analytics') || 'Estadísticas'}</h1>
        {hasNew && (
          <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Nuevos</span>
        )}
      </div>

      {/* Filtros: solo fechas + alerta + presets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
        <input
          className="border rounded-xl px-3 py-2"
          type="datetime-local"
          value={from.slice(0, 16)}
          onChange={(e) => setFrom(new Date(e.target.value).toISOString())}
        />
        <input
          className="border rounded-xl px-3 py-2"
          type="datetime-local"
          value={to.slice(0, 16)}
          onChange={(e) => setTo(new Date(e.target.value).toISOString())}
        />
        <select
          className="border rounded-xl px-3 py-2"
          value={alerta}
          onChange={(e) => setAlerta(e.target.value)}
        >
          <option value="">Alerta</option>
          <option value="verde">Verde</option>
          <option value="amarillo">Amarillo</option>
          <option value="rojo">Rojo</option>
        </select>
        <div className="flex items-center gap-2">
          <Preset onClick={() => { setFrom(new Date(Date.now() - 24 * 3600_000).toISOString()); setTo(new Date().toISOString()) }}>
            Últimas 24h
          </Preset>
          <Preset onClick={() => { setFrom(new Date(Date.now() - 7 * 86400_000).toISOString()); setTo(new Date().toISOString()) }}>
            Última semana
          </Preset>
          <Preset onClick={() => { setFrom(new Date(Date.now() - 30 * 86400_000).toISOString()); setTo(new Date().toISOString()) }}>
            Último mes
          </Preset>
        </div>
      </div>

      {/* KPIs (cards estilo respuestas) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi loading={pending} title="DOLOR PROMEDIO" value={fmt(k?.dolorProm, 1)} />
        <Kpi loading={pending} title="ALERTAS (%)" value={k ? `${alertPct}%` : '—'} />
        <Kpi loading={pending} title="TASA DE RESPUESTA" value={k ? `${Math.round((k.tasaRespuesta || 0) * 100)}%` : '—'} />
        <Kpi loading={pending} title="TIEMPO A 1ª RESPUESTA (MIN)" value={fmt(k?.tiempoPrimeraRespuestaMin, 0)} />
        <Kpi loading={pending} title="SATISFACCIÓN" value={fmt(k?.satisfProm, 1)} />
      </div>

      {/* Dolor por cirugía */}
      <Card title="Dolor por cirugía" loading={pending}>
        {s?.porCirugia?.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={s.porCirugia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tipo_cirugia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="dolor_prom" />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </Card>

      {/* Evolución temporal */}
      <Card title="Evolución temporal" loading={pending}>
        {s?.porDia?.length ? (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={s.porDia.map(d => ({ ...d, dayLabel: fmtDay(d.day) }))}>
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
        ) : <Empty />}
      </Card>

      {/* Tabla detalle */}
      <Card title="Detalle" loading={pendingTable}>
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
                  <Td>{r.nivel_alerta ?? '-'}</Td>
                  <Td>{r.dolor ?? '-'}</Td>
                  <Td>{r.satisfaccion ?? '-'}</Td>
                </tr>
              )) : (
                <tr><td className="py-6 text-center text-slate-500" colSpan={5}>No hay datos para estos filtros</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-slate-500 pt-2">Total: {total}</div>
      </Card>
    </div>
  )
}

/* ---------- UI helpers (mismo estilo que respuestas) ---------- */

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
    <div className="rounded-2xl border shadow-sm bg-white p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{title}</div>
        {loading ? <Skeleton className="h-4 w-24" /> : null}
      </div>
      {children}
    </div>
  )
}

function Preset({ children, onClick }: any) {
  return (
    <button onClick={onClick} className="px-3 py-2 rounded-xl border shadow-sm bg-white hover:bg-slate-50">
      {children}
    </button>
  )
}
function Th({ children }: any) { return <th className="py-2 pr-3">{children}</th> }
function Td({ children }: any) { return <td className="py-2 pr-3">{children}</td> }

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}
function Empty() {
  return <div className="h-[260px] flex items-center justify-center text-slate-500">No hay datos para estos filtros</div>
}
function fmt(n?: number, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toFixed(digits)
}