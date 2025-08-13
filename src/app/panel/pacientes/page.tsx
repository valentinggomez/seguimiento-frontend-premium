'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModalConfirmarEliminarPaciente } from '@/components/modales/ModalConfirmarEliminarPaciente'
import { useTranslation } from '@/i18n/useTranslation'

export default function PanelPacientes() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any | null>(null)
  const [editando, setEditando] = useState(false) 
  const [eliminando, setEliminando] = useState(false)
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false)
  const [pacienteAEliminar, setPacienteAEliminar] = useState<{ id: string, nombre: string } | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [paginaActual, setPaginaActual] = useState(1)
  const pacientesPorPagina = 20
  const { t } = useTranslation()

  const pacientesFiltrados = pacientes.filter((p) => {
    const texto = busqueda.toLowerCase()
    return (
      p.nombre.toLowerCase().includes(texto) ||
      (p.dni?.toString().toLowerCase().includes(texto) ?? false) ||
      (p.telefono?.toLowerCase().includes(texto) ?? false) ||
      (p.cirugia?.toLowerCase().includes(texto) ?? false) ||
      (p.obra_social?.toLowerCase().includes(texto) ?? false)
    )
  })

  // Slice para paginar
  const totalPaginas = Math.ceil(pacientesFiltrados.length / pacientesPorPagina)
  const pacientesPaginados = pacientesFiltrados.slice(
    (paginaActual - 1) * pacientesPorPagina,
    paginaActual * pacientesPorPagina
  )

  const guardarCambios = async () => {
    try {
      const headers = getAuthHeaders()

      const payload = {
        ...pacienteSeleccionado,
        edad: pacienteSeleccionado?.edad !== '' ? Number(pacienteSeleccionado.edad) : null,
        dni:  pacienteSeleccionado?.dni  !== '' ? Number(pacienteSeleccionado.dni)  : null,
      }
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pacientes/${pacienteSeleccionado.id}`,
        payload,
        { headers }
      )

      toast.success(t('pacientes.toast_actualizado'))
      setEditando(false)
      setPacienteSeleccionado(null)

      // Refrescar lista
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes`, {
        headers,
      })
      setPacientes(data.data || [])
    } catch (error) {
      console.error(error)
      toast.error(t('pacientes.toast_error_guardar'))
    }
  }

  const eliminarPaciente = async () => {
    if (!pacienteAEliminar) return

    setEliminando(true)
    try {
      const headers = getAuthHeaders()

      const res = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pacientes/${pacienteAEliminar.id}`,
        { headers }
      )

      if (res.status >= 400 || res.data?.error) {
        throw new Error(res.data?.error || 'Error al eliminar')
      }

      toast.success(t('pacientes.toast_eliminado'))

      // Refrescar lista
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes`, {
        headers,
      })
      setPacientes(data.data || [])
    } catch (error) {
      console.error(error)
      toast.error(t('pacientes.toast_error_eliminar'))
    } finally {
      setEliminando(false)
      setMostrarModalEliminar(false)
      setPacienteAEliminar(null)
    }
  }

  useEffect(() => {
    const fetchPacientes = async () => {
  try {
    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/pacientes`,
      {
        headers: getAuthHeaders(),
      }
    )
    setPacientes(data.data || [])
  } catch (error) {
    toast.error(t('pacientes.toast_error_cargar'))
    console.error(error)
  } finally {
    setLoading(false)
  }
}

    fetchPacientes()
    }, [])

  return (
    <div className="p-6">
      <h1 className="text-center text-2xl md:text-3xl font-medium tracking-wide text-slate-800 mb-6">
        📋 {t('pacientes.titulo')}
      </h1>
      <div className="mb-6 max-w-md relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        <Input
          type="text"
          placeholder={t('pacientes.placeholder_busqueda')}
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setPaginaActual(1)
          }}
          className="w-full pl-10 shadow-md rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>
      {loading ? (
        <p className="text-center text-gray-500">{t('pacientes.cargando')}</p>
      ) : pacientes.length === 0 ? (
        <p className="text-center text-gray-500">{t('pacientes.sin_registros')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-2xl overflow-hidden text-sm bg-white shadow-md">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10">
              <tr className="border-b">
                <th className="px-4 py-2 border">{t('pacientes.nombre')}</th>
                <th className="px-4 py-2 border">{t('pacientes.edad')}</th>
                <th className="px-4 py-2 border">{t('pacientes.dni')}</th>
                <th className="px-4 py-2 border">{t('pacientes.obra_social')}</th>
                <th className="px-4 py-2 border">{t('pacientes.telefono')}</th>
                <th className="px-4 py-2 border">{t('pacientes.cirugia')}</th>
                <th className="px-4 py-2 border">{t('pacientes.fecha')}</th>
                <th className="px-4 py-2 border">{t('pacientes.acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {pacientesPaginados.map((p, loopIndex) => (
                <tr
                  key={p.id}
                  className={`hover:bg-slate-50 ${loopIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <td className="px-4 py-2">{p.nombre}</td>
                  <td className="px-4 py-2">{p.edad}</td>
                  <td className="px-4 py-2">{p.dni || t('comun.vacio')}</td>
                  <td className="px-4 py-2">{p.obra_social || t('comun.vacio')}</td>
                  <td className="px-4 py-2">{p.telefono}</td>
                  <td className="px-4 py-2">{p.cirugia}</td>
                  <td className="px-4 py-2">
                    {p.fecha_cirugia
                      ? p.fecha_cirugia.split('T')[0].split('-').reverse().join('/')
                      : t('comun.vacio')}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      size="sm"
                      className="bg-yellow-100 text-yellow-900 hover:bg-yellow-200 font-semibold shadow-sm rounded-full px-3 py-1"
                      onClick={() => {
                        setPacienteSeleccionado(p)
                        setEditando(true)
                      }}
                    >
                      ✏️ {t('logs.acciones.editar')}
                    </Button>

                    <Button
                      size="sm"
                      className="bg-red-200 text-red-900 hover:bg-red-300 font-semibold shadow-sm rounded-full px-3 py-1 ml-2"
                      onClick={() => {
                        setPacienteAEliminar({ id: p.id, nombre: p.nombre })
                        setMostrarModalEliminar(true)
                      }}
                    >
                      🗑️ {t('logs.acciones.eliminar')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
            >
              ⬅️ {t('logs.paginacion.anterior')}
            </Button>
            <span className="text-slate-600 font-medium">
              {t('logs.paginacion.pagina_de', {
                actual: paginaActual,
                total: totalPaginas,
              })}
            </span>
            <Button
              variant="ghost"
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
            >
              {t('logs.paginacion.siguiente')} ➡️
            </Button>
          </div>
        </div>
      )}

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pacientes.editar_paciente')}</DialogTitle>
          </DialogHeader>

          {pacienteSeleccionado && (
            <div className="space-y-4">
              <Input
                placeholder={t('pacientes.nombre')}
                value={pacienteSeleccionado.nombre}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, nombre: e.target.value })
                }
              />
              <Input
                placeholder={t('pacientes.edad')}
                type="number"
                value={pacienteSeleccionado.edad}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, edad: e.target.value })
                }
              />

              <Input
                placeholder={t('pacientes.dni')}
                type="number"
                value={pacienteSeleccionado.dni}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, dni: e.target.value })
                }
              />
              <Input
                placeholder={t('pacientes.telefono')}
                value={pacienteSeleccionado.telefono}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, telefono: e.target.value })
                }
              />
              <Input
                placeholder={t('pacientes.obra_social')}
                value={pacienteSeleccionado.obra_social}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, obra_social: e.target.value })
                }
              />
              <Input
                placeholder={t('pacientes.cirugia')}
                value={pacienteSeleccionado.cirugia}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, cirugia: e.target.value })
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditando(false)}>
              {t('logs.acciones.cancelar')}
            </Button>
            <Button onClick={guardarCambios}>
              {t('logs.acciones.guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalConfirmarEliminarPaciente
        open={mostrarModalEliminar}
        onClose={() => setMostrarModalEliminar(false)}
        onConfirm={eliminarPaciente}
        nombrePaciente={pacienteAEliminar?.nombre || ''}
      />
    </div>
  )
}