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

export default function PanelPacientes() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any | null>(null)
  const [editando, setEditando] = useState(false) 
  const [eliminando, setEliminando] = useState(false)
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false)
  const [pacienteAEliminar, setPacienteAEliminar] = useState<{ id: string, nombre: string } | null>(null)
  const [busqueda, setBusqueda] = useState("")

  const guardarCambios = async () => {
    try {
      const headers = await getAuthHeaders()

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pacientes/${pacienteSeleccionado.id}`,
        pacienteSeleccionado,
        { headers }
      )

      toast.success('Paciente actualizado correctamente')
      setEditando(false)
      setPacienteSeleccionado(null)

      // Refrescar lista
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes`, {
        headers,
      })
      setPacientes(data.data || [])
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar cambios')
    }
  }

  const eliminarPaciente = async () => {
    if (!pacienteAEliminar) return

    setEliminando(true)
    try {
      const headers = await getAuthHeaders()

      const res = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pacientes/${pacienteAEliminar.id}`,
        { headers }
      )

      if (!res.data.ok) throw new Error(res.data.error || 'Error al eliminar')

      toast.success('✅ Paciente eliminado correctamente')

      // Refrescar lista
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes`, {
        headers,
      })
      setPacientes(data.data || [])
    } catch (error) {
      console.error(error)
      toast.error('❌ Error al eliminar paciente')
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
    toast.error('Error al cargar pacientes')
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
        📋 Pacientes registrados
      </h1>
      <div className="mb-6 max-w-md relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        <Input
          type="text"
          placeholder="Buscar por nombre, DNI, cirugía, teléfono u obra social..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 shadow-md rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>
      {loading ? (
        <p className="text-center text-gray-500">Cargando pacientes...</p>
      ) : pacientes.length === 0 ? (
        <p className="text-center text-gray-500">No hay pacientes registrados aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-2xl overflow-hidden text-sm bg-white shadow-md">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10">
            <tr className="border-b">
                <th className="px-4 py-2 border">Nombre</th>
                <th className="px-4 py-2 border">Edad</th>
                <th className="px-4 py-2 border">DNI</th>
                <th className="px-4 py-2 border">Obra Social</th>
                <th className="px-4 py-2 border">Teléfono</th>
                <th className="px-4 py-2 border">Cirugía</th>
                <th className="px-4 py-2 border">Fecha</th>
                <th className="px-4 py-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pacientes
                .filter((p) => {
                  const texto = busqueda.toLowerCase()
                  return (
                    p.nombre.toLowerCase().includes(texto) ||
                    (p.dni?.toString().toLowerCase().includes(texto) ?? false) ||
                    (p.telefono?.toLowerCase().includes(texto) ?? false) ||
                    (p.cirugia?.toLowerCase().includes(texto) ?? false) ||
                    (p.obra_social?.toLowerCase().includes(texto) ?? false)
                  )
                })
                .map((p, loopIndex) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${loopIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-2">{p.nombre}</td>
                  <td className="px-4 py-2">{p.edad}</td>
                  <td className="px-4 py-2">{p.dni || '—'}</td>
                  <td className="px-4 py-2">{p.obra_social || '—'}</td>
                  <td className="px-4 py-2">{p.telefono}</td>
                  <td className="px-4 py-2">{p.cirugia}</td>
                  <td className="px-4 py-2">
                    {p.fecha_cirugia
                      ? p.fecha_cirugia.split('T')[0].split('-').reverse().join('/')
                      : '—'}
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
                        ✏️ Editar
                      </Button>

                      <Button
                        size="sm"
                        className="bg-red-200 text-red-900 hover:bg-red-300 font-semibold shadow-sm rounded-full px-3 py-1 ml-2"
                        onClick={() => {
                          setPacienteAEliminar({ id: p.id, nombre: p.nombre })
                          setMostrarModalEliminar(true)
                        }}
                      >
                        🗑️ Eliminar
                      </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
          </DialogHeader>

          {pacienteSeleccionado && (
            <div className="space-y-4">
              <Input
                placeholder="Nombre"
                value={pacienteSeleccionado.nombre}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, nombre: e.target.value })
                }
              />
              <Input
                placeholder="Edad"
                value={pacienteSeleccionado.edad}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, edad: e.target.value })
                }
              />
              <Input
                placeholder="DNI"
                value={pacienteSeleccionado.dni}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, dni: e.target.value })
                }
              />
              <Input
                placeholder="Teléfono"
                value={pacienteSeleccionado.telefono}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, telefono: e.target.value })
                }
              />
              <Input
                placeholder="Obra social"
                value={pacienteSeleccionado.obra_social}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, obra_social: e.target.value })
                }
              />
              <Input
                placeholder="Cirugía"
                value={pacienteSeleccionado.cirugia}
                onChange={(e) =>
                  setPacienteSeleccionado({ ...pacienteSeleccionado, cirugia: e.target.value })
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCambios}>Guardar</Button>
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