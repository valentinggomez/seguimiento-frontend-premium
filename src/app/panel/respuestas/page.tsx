// src/app/panel/respuestas/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchConToken } from '@/lib/fetchConToken'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { useTranslation } from '@/i18n/useTranslation'

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
  score_ia?: number
    sugerencia_ia?: string
  respuestas_formulario?: Record<string, string | number | null>
}
function ModalConfirmacion({
  mostrar,
  cantidad,
  onConfirmar,
  onCancelar,
  t, // ✅ Pasar la función de traducción como prop
}: {
  mostrar: boolean
  cantidad: number
  onConfirmar: () => void
  onCancelar: () => void
  t: (clave: string, variables?: any) => string
}) {
  if (!mostrar) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl max-w-md w-full space-y-4 animate-fadeIn">
        <h3 className="text-lg font-semibold text-red-700">
          {t('respuestas.confirmar_eliminacion_titulo')}
        </h3>
        <p className="text-sm text-gray-700">
          {t('respuestas.confirmar_eliminacion_descripcion', { cantidad })}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            {t('respuestas.cancelar')}
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            {t('respuestas.eliminar')}
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
  const { t } = useTranslation()

  useEffect(() => {
    const fetchRespuestas = async () => {
      try {
        const res = await fetchConToken('/api/respuestas')
        const data = await res.json()
        console.log('📦 Respuestas desde backend:', data)
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
    const nivel = r.nivel_alerta?.toLowerCase().trim()
    if (nivel === 'rojo') return 'border-red-400 bg-red-50'
    if (nivel === 'amarillo') return 'border-yellow-300 bg-yellow-50'
    return 'border-green-400 bg-green-50'
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#003366]">
        {t('respuestas.titulo')}
      </h1>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#003366]">
          {t('respuestas.titulo')}
        </h2>
        <button
          onClick={() => {
            setModoEdicion(!modoEdicion)
            setSeleccionadas([])
          }}
          className="text-sm text-white bg-[#003366] px-4 py-2 rounded hover:bg-[#002244] transition"
        >
          {modoEdicion ? t('respuestas.cancelar_edicion') : `🗑️ ${t('respuestas.editar_respuestas')}`}
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
                  📄 {t('respuestas.seguimiento_de')} {r.paciente_nombre}
                  </h2>

                  <p className="text-sm text-gray-700">
                    {r.tipo_cirugia} • {r.edad} {t('respuestas.años')}<br />
                    {t('respuestas.sexo')}: {r.sexo} • {t('respuestas.peso')}: {r.peso}kg • {t('respuestas.altura')}: {r.altura}m • <span className="text-green-600 font-semibold">IMC: {r.imc}</span>
                  </p>

                  <div className="text-sm text-gray-500">
                    {new Date(r.creado_en).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
              </div>
            </div>

            {expandedId === r.id && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-gray-800 text-sm"
                >
                  {r.respuestas_formulario &&
                    Object.entries(r.respuestas_formulario).map(([clave, valor]) => (
                      <div key={clave}>
                        <strong>{t(`formulario.${clave}` as any) || clave}:</strong>{' '}
                        {valor != null && valor !== '' ? valor : t('respuestas.no_registrado')}
                      </div>
                    ))}
                </motion.div>

                <div className="mt-4">
                  <button
                    onClick={() =>
                      window.open(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/pdf/${r.id}?host=${window.location.hostname}`,
                        '_blank'
                      )
                    }
                    className="text-sm text-white bg-[#003366] px-4 py-2 rounded hover:bg-[#002244] transition"
                  >
                    📄 {t('respuestas.ver_pdf')}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
      {modoEdicion && seleccionadas.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-3">
          <p className="text-sm text-red-700">
            {t('respuestas.seleccionadas')}: {seleccionadas.length}
          </p>
          <button
            onClick={() => setMostrarModal(true)}
            className="bg-red-600 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-700 transition"
          >
            {t('respuestas.eliminar_respuestas_seleccionadas')}
          </button>
          <ModalConfirmacion
            mostrar={mostrarModal}
            cantidad={seleccionadas.length}
            onCancelar={() => setMostrarModal(false)}
            t={t}
            onConfirmar={async () => {
              try {
                const res = await fetchConToken('/api/respuestas', {
                  method: 'DELETE',
                  headers: getAuthHeaders(),
                  body: JSON.stringify({ ids: seleccionadas }),
                })
                if (res.ok) {
                  setRespuestas(prev => prev.filter(r => !seleccionadas.includes(r.id)))
                  setSeleccionadas([])
                  setModoEdicion(false)
                  setMostrarModal(false)
                } else {
                  alert('❌ ' + t('respuestas.error_eliminar'))
                }
              } catch (e) {
                alert('❌ ' + t('respuestas.error_servidor'))
              }
            }}
          />
        </div>
      )}
    </div> 
  )
}
