'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { Button } from '@/components/ui/button'

export default function PanelLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      const headers = await getAuthHeaders()
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/logs`, {
        headers,
        params: {
          search: busqueda,
        },
      })
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

  const handleBuscar = () => {
    fetchLogs()
  }

  return (
    <div className="p-6">
      <h1 className="text-center text-2xl md:text-3xl font-medium tracking-wide text-slate-800 mb-6">
        🩺 Auditoría Clínica — Logs de Trazabilidad
      </h1>

      <div className="mb-6 max-w-md relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        <Input
          type="text"
          placeholder="Buscar por email, acción o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
          className="w-full pl-10 shadow-md rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Cargando logs...</p>
      ) : logs.length === 0 ? (
        <p className="text-center text-gray-500">No hay registros de auditoría aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-2xl overflow-hidden text-sm bg-white shadow-md">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10">
              <tr className="border-b">
                <th className="px-4 py-2 border">Fecha</th>
                <th className="px-4 py-2 border">Usuario</th>
                <th className="px-4 py-2 border">Acción</th>
                <th className="px-4 py-2 border">Entidad</th>
                <th className="px-4 py-2 border">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={`hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(log.fecha).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-2">{log.usuario_email}</td>
                  <td className="px-4 py-2">{log.accion}</td>
                  <td className="px-4 py-2">{log.entidad}</td>
                  <td className="px-4 py-2">{log.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}