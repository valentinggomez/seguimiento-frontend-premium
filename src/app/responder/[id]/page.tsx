"use client"

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useClinica } from '@/lib/ClinicaProvider'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { useRef } from 'react'

let SpeechRecognition: any

if (typeof window !== 'undefined') {
  SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
}

function FieldBlock({
  label,
  name,
  type = 'text',
  isSelect = false,
  isTextarea = false,
  inputMode,
  value,
  onChange,
}: {
  label: string
  name: string
  type?: string
  isSelect?: boolean
  isTextarea?: boolean
  inputMode?: 'numeric' | 'text'
  value: any
  onChange: (e: React.ChangeEvent<any>) => void
}) {
  return (
    <div className="w-full">
      <label className="block font-semibold text-gray-700 mb-1 capitalize">{label}</label>
      {isSelect ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-800"
        >
          <option value="">Seleccionar...</option>
          <option>Sí</option>
          <option>No</option>
        </select>
      ) : isTextarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={3}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-800"
        />
      ) : (
        <input
          type={type}
          name={name}
          inputMode={inputMode}
          value={value}
          onChange={onChange}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 bg-white text-gray-800"
        />
      )}
    </div>
  )
}


export default function ResponderPage() {
  const { id } = useParams()
  const { clinica } = useClinica()
  const [paciente, setPaciente] = useState<any>(null)
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error' | 'enviando' | 'enviado'>('cargando')
  const [form, setForm] = useState<any>({})
  const [grabando, setGrabando] = useState(false)
  const [transcripcionVoz, setTranscripcionVoz] = useState('')
  const reconocimientoRef = useRef<any>(null)

  const camposBase = [
    { name: "telefono", label: "Teléfono de contacto", type: "text" },
    { name: "nombre_medico", label: "Nombre del médico", type: "text" },
    { name: "dolor_6h", label: "🤕 Nivel de dolor a las 6h", type: "text", numeric: true },
    { name: "dolor_24h", label: "🔥 Nivel de dolor a las 24h", type: "text", numeric: true },
    { name: "dolor_mayor_7", label: "📈 ¿Dolor mayor a 7?", type: "select" },
    { name: "nausea", label: "🤢 ¿Tuviste náuseas?", type: "select" },
    { name: "vomitos", label: "🤮 ¿Tuviste vómitos?", type: "select" },
    { name: "somnolencia", label: "😴 ¿Tuviste somnolencia?", type: "select" },
    { name: "requiere_mas_medicacion", label: "💊 ¿Requirió más medicación?", type: "select" },
    { name: "desperto_por_dolor", label: "🌙 ¿Se despertó por dolor?", type: "select" },
    { name: "satisfaccion", label: "🌟 Nivel de satisfacción (1 a 10)", type: "text", numeric: true },
    { name: "horas_movio_extremidades", label: "🏃 ¿Horas hasta mover extremidades?", type: "text", numeric: true },
    { name: "observacion", label: "📝 Observaciones (opcional)", type: "textarea" }
  ]

  const camposConfigurados = typeof clinica?.campos_formulario === 'string'
    ? clinica.campos_formulario.split(',').map(c => c.trim())
    : Array.isArray(clinica?.campos_formulario)
      ? clinica.campos_formulario
      : []

  const camposExtras = camposConfigurados
    .map((c: string) => {
      const [nombreYLabel, tipoRaw = 'text'] = c.split(':')
      const [name, labelRaw] = nombreYLabel.split('|')
      const tipo = tipoRaw.trim()

      return {
        name: name.trim(),
        label: (labelRaw || name).trim(),
        type: tipo,
        numeric: tipo === 'number'
      }
    })
    .filter((campo: any) => campo.name && !camposBase.some(cb => cb.name === campo.name))

  const camposFinal = [...camposBase, ...camposExtras]

  const campoActivo = (nombre: string) =>
    !clinica?.campos_formulario || camposConfigurados.some((c: string) => c.startsWith(nombre))

  const iniciarGrabacion = () => {
    if (!SpeechRecognition) {
      alert('⚠️ Tu navegador no soporta reconocimiento de voz.')
      return
    }
    const reconocimiento = new SpeechRecognition()
    reconocimiento.lang = 'es-ES' // 📌 Cambiar según idioma
    reconocimiento.interimResults = true
    reconocimiento.continuous = true

    reconocimiento.onresult = (event: any) => {
      let texto = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        texto += event.results[i][0].transcript
      }
      setTranscripcionVoz(texto)
    }

    reconocimiento.onend = () => setGrabando(false)

    reconocimientoRef.current = reconocimiento
    reconocimiento.start()
    setGrabando(true)
  }

  const detenerGrabacion = () => {
    reconocimientoRef.current?.stop()
    setGrabando(false)
  }
  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/pacientes/${id}`,
          {
            headers: getAuthHeaders()
          }
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        setPaciente(data)
        setEstado('ok')
      } catch {
        setEstado('error')
      }
    }
    fetchPaciente()
  }, [id])

  const handleChange = useCallback((e: any) => {
    const { name, value } = e.target
    setForm((prev: any) => ({ ...prev, [name]: value }))
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const camposObligatorios = camposFinal.filter(c => c.name !== "observacion" && campoActivo(c.name))
    for (const campo of camposObligatorios) {
      if (!form[campo.name]) {
        alert(`Por favor completá el campo: ${campo.label}`)
        return
      }
    }

    setEstado('enviando')

    const camposFinalMapped = Object.entries(form).reduce((acc, [key, value]) => {
      acc[key] = value // ✅ usamos el name real, no el label visible
      return acc
    }, {} as Record<string, any>)

    const payload = {
      paciente_id: id,
      clinica_id: clinica?.id,
      ...camposFinalMapped,
      campos_personalizados: {
        transcripcion: transcripcionVoz || ''
      }
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/respuestas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clinica-host': window.location.hostname
        },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        try {
          const data = await res.json()
          const respuestaId = data?.id
          if (!respuestaId) throw new Error("No se obtuvo ID de respuesta")

          const authHeaders = getAuthHeaders()
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ia/prediccion/${respuestaId}`, {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
              'x-clinica-host': window.location.hostname,
            },
          })
        } catch (err) {
          console.warn("⚠️ No se pudo guardar score IA:", err)
        }

        setEstado('enviado')
      } else {
        setEstado('error')
      }
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'cargando') return <div className="text-center mt-10">Cargando paciente...</div>
  if (estado === 'error') return <div className="text-center mt-10 text-red-500">Error al cargar los datos.</div>
  if (estado === 'enviado') return <div className="text-center mt-10 text-green-600 font-semibold text-xl">¡Gracias por completar el seguimiento!</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white flex justify-center p-4 pt-10 md:pt-20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-3xl bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200 p-8 space-y-8"
      >
        {clinica?.logo_url && (
          <div className="text-center">
            <img src={clinica.logo_url} alt={clinica.nombre_clinica} className="h-16 mx-auto drop-shadow-md" />
            <p className="mt-2 text-sm text-gray-600">{clinica.nombre_clinica}</p>
          </div>
        )}

        <h1 className="text-3xl font-bold text-center text-[#003366]">Seguimiento postoperatorio</h1>
        <p className="text-center text-gray-600 mb-6 text-sm">Completá cuidadosamente este control clínico.</p>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {camposFinal.map((campo) => {
              if (!campoActivo(campo.name)) return null

              return (
                <FieldBlock
                  key={campo.name}
                  label={campo.label}
                  name={campo.name}
                  type={campo.numeric ? 'number' : 'text'}
                  isSelect={campo.type === 'select'}
                  isTextarea={campo.type === 'textarea'}
                  inputMode={campo.numeric ? 'numeric' : 'text'}
                  value={form[campo.name] || ''}
                  onChange={handleChange}
                />
              )
            })}
          </div>
          
          {/* 🎤 Grabación por voz */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-blue-800">🎙 Responder por voz</p>

            <div className="flex gap-4">
              {!grabando ? (
                <button
                  type="button"
                  onClick={iniciarGrabacion}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  🎤 Iniciar grabación
                </button>
              ) : (
                <button
                  type="button"
                  onClick={detenerGrabacion}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  ⏹ Detener grabación
                </button>
              )}
            </div>

            {transcripcionVoz && (
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-600">Transcripción detectada:</p>
                <p className="italic text-gray-800">{transcripcionVoz}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-[#003366] hover:bg-[#002244] text-white font-semibold py-3 px-6 rounded-xl transition-all">
              {estado === 'enviando' ? 'Enviando...' : 'Enviar respuesta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
} 
