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
  campos_personalizados?: Record<string, any> | string | null
  transcripcion_voz?: string;
  sintomas_ia?: string[];
  [key: string]: any;
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

  const prioridad = { verde: 0, amarillo: 1, rojo: 2 } as const

  function alertaPorTexto(texto?: string): 'verde'|'amarillo'|'rojo'|null {
    if (!texto) return null
    const t = texto.toLowerCase()
    const pideAyuda = /(necesito ayuda|auxilio|urgente|no puedo|desmayo|sangrado|no respiro)/
    const dolor = /(me duele|dolor)/
    const fuerte = /(mucho|muy|fuerte|intenso|terrible)/
    if (pideAyuda.test(t)) return 'rojo'
    if (dolor.test(t) && fuerte.test(t)) return 'rojo'
    if (dolor.test(t)) return 'amarillo'
    return null
  }

  const getColorClass = (r: Respuesta) => {
    const base = (r.nivel_alerta || 'verde').toLowerCase().trim() as 'verde'|'amarillo'|'rojo'
    const campos = getCamposPersonalizados(r)
    const porTexto = alertaPorTexto(campos?.transcripcion)
    const final = porTexto && prioridad[porTexto] > prioridad[base] ? porTexto : base

    if (final === 'rojo') return 'border-red-400 bg-red-50'
    if (final === 'amarillo') return 'border-yellow-300 bg-yellow-50'
    return 'border-green-400 bg-green-50'
  }

  const getCamposPersonalizados = (r: Respuesta): Record<string, any> => {
    try {
      let obj: any = r.campos_personalizados;
      if (typeof obj === 'string') obj = JSON.parse(obj);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};

      // ✅ Des-anidar SOLO si es un wrapper puro (sin otras claves útiles)
      if (
        obj.campos_personalizados &&
        typeof obj.campos_personalizados === 'object' &&
        !Array.isArray(obj.campos_personalizados)
      ) {
        const otras = Object.keys(obj).filter(k => k !== 'campos_personalizados');
        if (otras.length === 0) {
          obj = obj.campos_personalizados;
        }
        // si hay otras claves (tu caso), NO lo pisamos
      }

      // 🧹 Limpiar claves internas
      const ocultos = new Set([
        'clinica_id',
        'campos_personalizados',
        'respuestas_formulario',
        'id','creado_en','paciente_nombre',
        'nivel_alerta','alerta','score_ia','sugerencia_ia',
      ]);

      const limpio: Record<string, any> = {};
      for (const k of Object.keys(obj)) {
        if (!ocultos.has(k)) limpio[k] = obj[k];
      }

      // 🔧 Normalizar sintomas_ia (soporta string JSON, CSV, objeto, camelCase)
      let s = limpio.sintomas_ia ?? (limpio as any).sintomasIA ?? null;

      if (typeof s === 'string') {
        try { s = JSON.parse(s); } catch {
          s = s.split(/[,\|;]+/).map((x: string) => x.trim()).filter(Boolean);
        }
      }
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        s = Object.values(s).map(String);
      }
      if (Array.isArray(s)) {
        limpio.sintomas_ia = s.map(String).filter(Boolean);
      } else {
        delete limpio.sintomas_ia;
      }

      return limpio;
    } catch (err) {
      console.warn(`❌ Error parseando campos_personalizados para respuesta ${r.id}`, err);
      return {};
    }
  };

  const getRespuestasFormulario = (r: Respuesta): Record<string, any> => {
    try {
      // 1) nombres habituales
      let obj: any =
        (r as any).respuestas_formulario ??
        (r as any).respuestas ??
        (r as any).formulario ??
        null;

      // 2) alternativos usados por backend (como en tu log)
      if (!obj) obj = (r as any).camposExtra ?? (r as any).campos_extra ?? null;

      // 3) si viene envuelto dentro de campos_personalizados (string u objeto)
      if (!obj && (r as any).campos_personalizados) {
        let cp: any = (r as any).campos_personalizados;
        if (typeof cp === 'string') { try { cp = JSON.parse(cp) } catch {} }
        if (cp && typeof cp === 'object') {
          obj = cp.respuestas_formulario ?? cp.camposExtra ?? cp.campos_extra ?? null;
        }
      }

      // des-stringificar si hace falta
      if (typeof obj === 'string') { try { obj = JSON.parse(obj) } catch {} }
      if (!obj || typeof obj !== 'object') return {};

      // si viene como array raro, normalizar a objeto plano
      if (Array.isArray(obj)) {
        const out: Record<string, any> = {};
        for (const item of obj) {
          if (Array.isArray(item) && item.length >= 2) {
            out[String(item[0])] = item[1];
          } else if (item && typeof item === 'object') {
            if ('clave' in item && 'valor' in item) out[String((item as any).clave)] = (item as any).valor;
            else Object.assign(out, item);
          }
        }
        return out;
      }

      // limpiar claves internas que vi en tus logs
      const ocultos = new Set(['clinica_id', 'campos_personalizados']);
      const limpio: Record<string, any> = {};
      for (const k of Object.keys(obj)) if (!ocultos.has(k)) limpio[k] = obj[k];
      return limpio;
    } catch {
      return {};
    }
  };

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
                    {t('respuestas.sexo')}: {r.sexo} • {t('respuestas.peso')}: {r.peso}kg • {t('respuestas.altura')}: {r.altura}m • <span className="text-green-600 font-semibold">{t('respuestas.imc')}: {r.imc}</span>
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
                  {(() => {
                    const campos = getCamposPersonalizados(r)
                    const form   = getRespuestasFormulario(r)

                    const HIDDEN = new Set(['clinica_id','transcripcion','sintomas_ia','campos_personalizados'])

                    const formEntries   = Object.entries(form).filter(([k]) => !HIDDEN.has(k))
                    const customEntries = Object.entries(campos).filter(([k]) => !HIDDEN.has(k))

                    // También consideramos voz/síntomas para decidir si mostrar "sin_campos"
                    const transcripcion =
                      (typeof campos.transcripcion === 'string' && campos.transcripcion.trim()) ||
                      (typeof (r as any).transcripcion_voz === 'string' && (r as any).transcripcion_voz.trim()) ||
                      ''
                    const sintomasIA = Array.isArray(campos.sintomas_ia) ? campos.sintomas_ia
                                    : Array.isArray((r as any).sintomas_ia) ? (r as any).sintomas_ia
                                    : []

                    if (formEntries.length === 0 && customEntries.length === 0 && !transcripcion && sintomasIA.length === 0) {
                      return (
                        <div className="text-gray-500 italic col-span-2">
                          {t('respuestas.sin_campos')}
                        </div>
                      )
                    }

                    const stripEmojis = (s: string) =>
                      s.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()

                    return (
                      <>
                        {/* 🧾 Campos del formulario (pueden venir con labels y emojis) */}
                        {formEntries.map(([label, valor]) => {
                          const visible = typeof label === 'string' ? label : String(label)
                          const texto = valor != null && valor !== '' ? String(valor) : t('respuestas.no_registrado')
                          return (
                            <div key={`form-${visible}`}>
                              <strong>{visible}</strong>: {texto}
                              {/* Si preferís sin emojis: <strong>{stripEmojis(visible)}</strong> */}
                            </div>
                          )
                        })}

                        {/* ⚙️ Campos personalizados (resto) */}
                        {customEntries.map(([clave, valor]) => {
                          // primero intentamos traducir con claves técnicas, si no, dejamos la clave tal cual
                          const maybe = t(`campos_formulario.${clave}`)
                          const label = maybe !== `campos_formulario.${clave}` ? maybe : clave
                          const texto = valor != null && valor !== ''
                            ? (typeof valor === 'object' ? JSON.stringify(valor) : String(valor))
                            : t('respuestas.no_registrado')
                          return (
                            <div key={`custom-${clave}`}>
                              <strong>{label}:</strong> {texto}
                            </div>
                          )
                        })}
                      </>
                    )
                  })()}
                </motion.div>

                {/* 🧠 BLOQUE DE RESPUESTA POR VOZ Y SÍNTOMAS IA (usando campos parseados) */}
                {(() => {
                  const campos = getCamposPersonalizados(r)
                  const transcripcion = typeof campos.transcripcion === 'string' ? campos.transcripcion.trim() : ''
                  const sintomasIA = Array.isArray(campos.sintomas_ia) ? campos.sintomas_ia : []

                  return (
                    <>
                      {transcripcion && (
                        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-6 mt-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2 text-blue-900">
                            <span className="text-xl">{'🗣️'}</span>
                            <h3 className="font-semibold text-base tracking-wide">{t('respuestas.transcripcion_voz')}</h3>
                          </div>
                          <blockquote className="text-base text-slate-800 italic leading-relaxed border-l-4 border-blue-400 pl-4 whitespace-pre-wrap">
                            {transcripcion}
                          </blockquote>
                        </div>
                      )}

                      {sintomasIA.length > 0 && (
                        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6 mt-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2 text-slate-800">
                            <span className="text-xl">{'🧬'}</span>
                            <h3 className="font-semibold text-base tracking-wide">{t('respuestas.sintomas_detectados_ia')}</h3>
                          </div>
                          <ul className="list-disc list-inside text-base text-slate-700 leading-relaxed ml-2">
                            {sintomasIA.map((tag: string, i: number) => <li key={i}>{tag}</li>)}
                          </ul>
                        </div>
                      )}
                    </>
                  )
                })()}
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
