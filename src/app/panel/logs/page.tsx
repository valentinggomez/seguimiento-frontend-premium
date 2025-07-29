'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatFechaLocal } from '@/lib/formatFechaLocal'
import { formatearAccionLog } from '@/lib/formatearAccionLog'

export default function PanelLogs() {
  const [logs, setLogs] = useState<any[]>([])
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

    const desdeOk = fechaDesde ? fechaLog >= new Date(fechaDesde) : true
    const hastaOk = fechaHasta ? fechaLog <= new Date(fechaHasta + 'T23:59:59') : true

    return coincideBusqueda && desdeOk && hastaOk
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
        🩺 Auditoría Clínica
        </h1>
        <p className="text-center text-slate-600 mb-6">
        Logs de trazabilidad legal y operativa del sistema.
        </p>

      {/* Filtro por fecha */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Desde:</label>
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
        <div>
          <label className="block text-sm text-slate-600 mb-1">Hasta:</label>
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

      {/* Buscador */}
      <div className="mb-6 flex max-w-xl mx-auto gap-2">
        <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <Input
            type="text"
            placeholder="Buscar por email, acción o descripción..."
            value={busqueda}
            onChange={(e) => {
                setBusqueda(e.target.value)
                setPaginaActual(1)
            }}
            className="w-full pl-10 shadow-md rounded-xl text-slate-800 placeholder:text-slate-400"
            />
        </div>
      </div>

      <div className="mb-4 max-w-xl mx-auto flex gap-4 items-center">
        <label className="text-sm text-slate-700 font-medium">Filtrar por acción:</label>
        <select
            value={accionSeleccionada}
            onChange={(e) => {
            setAccionSeleccionada(e.target.value)
            setPaginaActual(1)
            }}
            className="rounded-xl border border-slate-300 px-3 py-1 text-sm shadow-sm text-slate-700"
        >
            <option value="">Todas</option>
            <option value="registro_paciente">Registro de paciente</option>
            <option value="edicion_paciente">Edición de paciente</option>
            <option value="eliminacion_paciente">Eliminación de paciente</option>
            <option value="registro_respuesta">Registro de respuesta</option>
            <option value="envio_whatsapp">Envío por WhatsApp</option>
            <option value="respuesta_guardada">Respuesta guardada</option>
            {/* Podés agregar más acciones según tu sistema */}
        </select>
        </div>

      {loading ? (
        <p className="text-center text-gray-500">Cargando logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-center text-gray-500">No hay registros de auditoría aún.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full rounded-2xl overflow-hidden text-sm bg-white shadow-md border border-slate-200">
                <thead className="bg-slate-100 text-[#003466] font-semibold text-sm uppercase tracking-wide">
                    <tr className="border-b">
                    <th className="px-4 py-2 border">Fecha</th>
                    <th className="px-4 py-2 border">Usuario</th>
                    <th className="px-4 py-2 border">Acción</th>
                    <th className="px-4 py-2 border">Entidad</th>
                    <th className="px-4 py-2 border">Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    {logsPaginados.map((log, i) => (
                    <tr key={log.id} className={`hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-4 py-2 text-slate-800 font-mono text-[13px]">
                        {formatFechaLocal(log.fecha)}
                        </td>
                        <td className="px-4 py-2 text-slate-700">{log.usuario_email}</td>
                        <td className="px-4 py-2">{formatearAccionLog(log.accion)}</td>
                        <td className="px-4 py-2 text-slate-700">{log.entidad}</td>
                        <td className="px-4 py-2 text-slate-700 truncate max-w-xs" title={log.descripcion}>
                        {log.descripcion}
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
                ◀ Anterior
            </Button>
            <span className="font-medium">
                Página {paginaActual} de {totalPaginas}
            </span>
            <Button
                variant="ghost"
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
            >
                Siguiente ▶
            </Button>
          </div>
        </>
      )}
    </div>
  )
}