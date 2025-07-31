'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n/useTranslation'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatFechaLocal } from '@/lib/formatFechaLocal'
import { formatearAccionLog } from '@/lib/formatearAccionLog'

export default function PanelLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const logsPorPagina = 15
  const [accionSeleccionada, setAccionSeleccionada] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  
  // Filtrado local
  const logsFiltrados = logs.filter((log) => {
    const texto = busqueda.toLowerCase()
    const fechaLog = new Date(log.fecha)

    const coincideBusqueda =
        log.usuario_email?.toLowerCase().includes(texto) ||
        log.accion?.toLowerCase().includes(texto) ||
        log.descripcion?.toLowerCase().includes(texto)

    const coincideAccion = accionSeleccionada
        ? log.accion === accionSeleccionada
        : true

    const desdeOk = fechaDesde ? fechaLog >= new Date(fechaDesde) : true
    const hastaOk = fechaHasta ? fechaLog <= new Date(fechaHasta + 'T23:59:59') : true

    return coincideBusqueda && coincideAccion && desdeOk && hastaOk
  })

  // Paginación
  const totalPaginas = Math.ceil(logsFiltrados.length / logsPorPagina)
  const logsPaginados = logsFiltrados.slice(
    (paginaActual - 1) * logsPorPagina,
    paginaActual * logsPorPagina
  )

  const fetchLogs = async () => {
    try {
      const headers = await getAuthHeaders()
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/logs`, { headers })
      setLogs(data.logs || [])
    } catch (error) {
      toast.error('Error al cargar los logs')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-center text-3xl font-bold tracking-tight text-[#003466] mb-2">
  🩺 {t('logs.titulo')}
    </h1>
    <p className="text-center text-slate-600 mb-6">
    {t('logs.subtitulo')}
    </p>

      {/* Buscador */}
      <div className="mb-6 flex max-w-xl mx-auto gap-2">
        <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <Input
            type="text"
            placeholder={t('logs.buscar')}
            value={busqueda}
            onChange={(e) => {
                setBusqueda(e.target.value)
                setPaginaActual(1)
            }}
            className="w-full pl-10 shadow-md rounded-xl text-slate-800 placeholder:text-slate-400"
            />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-6 items-end">
        {/* Filtro por acción */}
        <div className="flex flex-col">
            <label className="text-sm text-slate-700 font-medium mb-1">
              {t('logs.filtroAccion')}
            </label>
            <select
            value={accionSeleccionada}
            onChange={(e) => {
                setAccionSeleccionada(e.target.value)
                setPaginaActual(1)
            }}
            className="rounded-xl border border-slate-300 px-3 py-1 text-sm shadow-sm text-slate-700"
            >
            <option value="">{t('logs.todas')}</option>
            <option value="registro_paciente">{t('logs.acciones.registro_paciente')}</option>
            <option value="edicion_paciente">{t('logs.acciones.paciente_editado')}</option>
            <option value="eliminacion_paciente">{t('logs.acciones.paciente_eliminado')}</option>
            <option value="registro_respuesta">{t('logs.acciones.registro_respuesta')}</option>
            <option value="envio_whatsapp">{t('logs.acciones.envio_whatsapp')}</option>
            <option value="respuesta_guardada">{t('logs.acciones.respuesta_guardada')}</option>
            </select>
        </div>

        {/* Filtro por fecha desde */}
        <div className="flex flex-col">
            <label className="block text-sm text-slate-600 mb-1">
              {t('logs.desde')}
            </label>
            <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => {
                setFechaDesde(e.target.value)
                setPaginaActual(1)
            }}
            className="rounded-xl shadow-md"
            />
        </div>

        {/* Filtro por fecha hasta */}
        <div className="flex flex-col">
            <label className="block text-sm text-slate-600 mb-1">
              {t('logs.hasta')}
            </label>
            <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => {
                setFechaHasta(e.target.value)
                setPaginaActual(1)
            }}
            className="rounded-xl shadow-md"
            />
        </div>
        </div>

      {loading ? (
        <p className="text-center text-gray-500">{t('logs.cargando')}</p>
      ) : logs.length === 0 ? (
        <p className="text-center text-gray-500">{t('logs.no_registros')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full rounded-2xl overflow-hidden text-sm bg-white shadow-md border border-slate-200">
                <thead className="bg-slate-100 text-[#003466] font-semibold text-sm uppercase tracking-wide">
                    <tr className="border-b">
                    <th className="px-4 py-2 border">{t('logs.columnas.fecha')}</th>
                    <th className="px-4 py-2 border">{t('logs.columnas.usuario')}</th>
                    <th className="px-4 py-2 border">{t('logs.columnas.accion')}</th>
                    <th className="px-4 py-2 border">{t('logs.columnas.entidad')}</th>
                    <th className="px-4 py-2 border">{t('logs.columnas.descripcion')}</th>
                    </tr>
                </thead>
                <tbody>
                    {logsPaginados.map((log, i) => (
                    <tr key={log.id} className={`hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-4 py-2 text-slate-800 font-mono text-[13px]">
                        {formatFechaLocal(log.fecha)}
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                        {log.usuario_email || t('logs.usuario_sistema')}
                        </td>
                        <td className="px-4 py-2">{t(`logs.acciones.${log.accion}`)}</td>
                        <td className="px-4 py-2">
                          {log.entidad && t(`logs.entidades.${log.entidad}`) !== `logs.entidades.${log.entidad}`
                            ? t(`logs.entidades.${log.entidad}`)
                            : log.entidad || '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-700 truncate max-w-xs" title={log.descripcion}>
                          {t(`logs.descripciones.${log.descripcion}`) !== `logs.descripciones.${log.descripcion}`
                            ? t(`logs.descripciones.${log.descripcion}`)
                            : log.descripcion}
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex justify-center items-center gap-2 mt-6 text-slate-600">
            <Button
                variant="ghost"
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
            >
                ◀ {t('logs.paginacion.anterior')}
            </Button>

                <span className="font-medium">
                  <span className="font-medium">
                    {t('logs.paginacion.pagina')
                        .replace('{{current}}', paginaActual.toString())
                        .replace('{{total}}', totalPaginas.toString())}
                    </span>
                </span>

            <Button
                variant="ghost"
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
            >
                {t('logs.paginacion.siguiente')} ▶
            </Button>
          </div>
        </>
      )}
    </div>
  )
}