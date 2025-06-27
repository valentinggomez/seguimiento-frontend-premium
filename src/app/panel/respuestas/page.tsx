// src/app/panel/respuestas/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Respuesta {
  id: string
  paciente_nombre: string
  edad: number
  sexo: string
  peso: number
  altura: number
  imc: number
  tipo_cirugia: string
  creado_en: string
  dolor_6h: number
  dolor_24h: number
  dolor_mayor_7: string
  nausea: string
  vomitos: string
  somnolencia: string
  requiere_mas_medicacion: string
  desperto_por_dolor: string
  satisfaccion: number
  observacion: string
  alerta: boolean
  nivel_alerta: string
}

function ModalConfirmacion({
  mostrar,
  cantidad,
  onConfirmar,
  onCancelar,
}: {
  mostrar: boolean
  cantidad: number
  onConfirmar: () => void
  onCancelar: () => void
}) {
  if (!mostrar) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl max-w-md w-full space-y-4 animate-fadeIn">
        <h3 className="text-lg font-semibold text-red-700">¿Eliminar respuestas seleccionadas?</h3>
        <p className="text-sm text-gray-700">
          Esta acción eliminará <strong>{cantidad}</strong> respuestas clínicas del sistema. ¿Estás seguro que deseas continuar?
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PanelRespuestas() {
  const [respuestas, setRespuestas] = useState<Respuesta[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)

  useEffect(() => {
    const fetchRespuestas = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/respuestas`, {
          headers: {
            'x-clinica-host': window.location.hostname
          }
        })
        const data = await res.json()
        console.log(data)
        if (Array.isArray(data)) {
          setRespuestas(data)
        } else if (data && Array.isArray(data.data)) {
          setRespuestas(data.data)
        } else {
          console.warn('❌ Respuesta inesperada del backend:', data)
          setRespuestas([])
        }
      } catch (e) {
        console.error('Error al cargar respuestas:', e)
      }
    }
    fetchRespuestas()
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const getColorClass = (r: Respuesta) => {
    if (r.nivel_alerta === 'rojo') return 'border-red-400 bg-red-50'
    if (r.nivel_alerta === 'amarillo') return 'border-yellow-300 bg-yellow-50'
    return 'border-green-400 bg-green-50'
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#003366]">Respuestas postoperatorias</h1>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#003366]">Respuestas postoperatorias</h2>
        <button
          onClick={() => {
            setModoEdicion(!modoEdicion)
            setSeleccionadas([])
          }}
          className="text-sm text-white bg-[#003366] px-4 py-2 rounded hover:bg-[#002244] transition"
        >
          {modoEdicion ? 'Cancelar edición' : '🗑️ Editar respuestas'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {Array.isArray(respuestas) && respuestas.map((r) => (
          <motion.div
            key={r.id}
            layout
            className={`rounded-xl border ${getColorClass(r)} p-4 shadow-sm ${modoEdicion ? '' : 'cursor-pointer'}`}
            onClick={() => {
              if (!modoEdicion) toggleExpand(r.id)
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                {modoEdicion && (
                  <input
                    type="checkbox"
                    className="mr-3 accent-[#003366]"
                    checked={seleccionadas.includes(r.id)}
                    onChange={() => {
                      setSeleccionadas(prev =>
                        prev.includes(r.id)
                          ? prev.filter(id => id !== r.id)
                          : [...prev, r.id]
                      )
                    }}
                  />
                )}
                <h2 className="font-semibold text-[#663300] flex items-center gap-2">
                  📄 Seguimiento de {r.paciente_nombre}
                </h2>
                <p className="text-sm text-gray-700">
                  {r.tipo_cirugia} • {r.edad} años<br />
                  Sexo: {r.sexo} • Peso: {r.peso}kg • Altura: {r.altura}m • <span className="text-green-600 font-semibold">IMC: {r.imc}</span>
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(r.creado_en).toLocaleString('es-AR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>

            {expandedId === r.id && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-gray-800 text-sm"
                >
                  <div><strong>Dolor 6h:</strong> {r.dolor_6h}</div>
                  <div><strong>Dolor 24h:</strong> {r.dolor_24h}</div>
                  <div><strong>¿Dolor mayor a 7?</strong> {r.dolor_mayor_7 || 'No registrado'}</div>
                  <div><strong>Náuseas:</strong> {r.nausea}</div>
                  <div><strong>Vómitos:</strong> {r.vomitos || 'No registrado'}</div>
                  <div><strong>Somnolencia:</strong> {r.somnolencia}</div>
                  <div><strong>Satisfacción:</strong> {r.satisfaccion ?? 'No registrado'}</div>
                  <div><strong>Observaciones:</strong> {r.observacion || 'No'}</div>
                </motion.div>

                <div className="mt-4">
                  <button
                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/pdf/${r.id}`, '_blank')}
                    className="text-sm text-white bg-[#003366] px-4 py-2 rounded hover:bg-[#002244] transition"
                  >
                    📄 Ver PDF institucional
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
      {modoEdicion && seleccionadas.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-3">
          <p className="text-sm text-red-700">Seleccionadas: {seleccionadas.length}</p>
          <button
            onClick={() => setMostrarModal(true)}

            className="bg-red-600 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-700 transition"
          >
            Eliminar respuestas seleccionadas
          </button>
          <ModalConfirmacion
            mostrar={mostrarModal}
            cantidad={seleccionadas.length}
            onCancelar={() => setMostrarModal(false)}
            onConfirmar={async () => {
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/respuestas`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-clinica-host': window.location.hostname
                  },
                  body: JSON.stringify({ ids: seleccionadas }),
                })
                if (res.ok) {
                  setRespuestas(prev => prev.filter(r => !seleccionadas.includes(r.id)))
                  setSeleccionadas([])
                  setModoEdicion(false)
                  setMostrarModal(false)
                } else {
                  alert('❌ Error al eliminar respuestas')
                }
              } catch (e) {
                alert('❌ Error al conectar con el servidor')
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
