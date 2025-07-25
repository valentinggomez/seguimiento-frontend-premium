'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'

export default function PanelPacientes() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPacientes = async () => {
  try {
    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pacientes`,
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
      <h1 className="text-3xl font-bold mb-6">📋 Pacientes registrados</h1>

      {loading ? (
        <p className="text-center text-gray-500">Cargando pacientes...</p>
      ) : pacientes.length === 0 ? (
        <p className="text-center text-gray-500">No hay pacientes registrados aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg shadow-sm text-sm bg-white">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-2 border">Nombre</th>
                <th className="px-4 py-2 border">Edad</th>
                <th className="px-4 py-2 border">Teléfono</th>
                <th className="px-4 py-2 border">Cirugía</th>
                <th className="px-4 py-2 border">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{p.nombre}</td>
                  <td className="px-4 py-2">{p.edad}</td>
                  <td className="px-4 py-2">{p.telefono}</td>
                  <td className="px-4 py-2">{p.cirugia}</td>
                  <td className="px-4 py-2">
                    {p.fecha_cirugia ? new Date(p.fecha_cirugia).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}