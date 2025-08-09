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
    const bufferRef = useRef<string>('')
    const autoRestartRef = useRef<boolean>(false)

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

    const iniciarGrabacion = (reset = false) => {
      if (!SpeechRecognition) { alert('⚠️ Tu navegador no soporta reconocimiento de voz.'); return }
      if (grabando) return  // ← evita doble inicio

      if (reset) { bufferRef.current = ''; setTranscripcionVoz('') }

      const reconocimiento = new SpeechRecognition()
      reconocimiento.lang = 'es-ES'
      reconocimiento.interimResults = true
      reconocimiento.continuous = true

      autoRestartRef.current = true

      reconocimiento.onstart = () => setGrabando(true)            // ← asegura estado
      reconocimiento.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          const text = (res[0]?.transcript ?? '').replace(/\s+/g, ' ')
          if (res.isFinal) bufferRef.current = `${bufferRef.current} ${text}`.trim()
          else interim += text
        }
        setTranscripcionVoz(`${bufferRef.current} ${interim}`.trim())
      }
      reconocimiento.onend = () => {
        if (autoRestartRef.current) setTimeout(() => { try { reconocimiento.start() } catch {} }, 200)
        else setGrabando(false)
      }
      reconocimiento.onerror = (e: any) => {
        // si es por “no-speech” o “network”, reintenta; si es “not-allowed”, corta
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          autoRestartRef.current = false
          setGrabando(false)
        } else if (autoRestartRef.current) {
          try { reconocimiento.stop() } catch {}
        }
      }

      reconocimientoRef.current = reconocimiento
      try { reconocimiento.start() } catch {}
    }

    const detenerGrabacion = () => {
      autoRestartRef.current = false
      try { reconocimientoRef.current?.stop() } catch {}
      setGrabando(false)
      // consolidar lo visible en el buffer
      bufferRef.current = (transcripcionVoz.trim() || bufferRef.current).trim()
      setTranscripcionVoz(bufferRef.current)
    }

    const volverAGrabar = () => {
      detenerGrabacion()
      bufferRef.current = ''
      setTranscripcionVoz('')
      iniciarGrabacion(true)
    }

    const borrarGrabacion = () => {
      detenerGrabacion()
      bufferRef.current = ''
      setTranscripcionVoz('')
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

    useEffect(() => {
      // cleanup al desmontar: cortar reconocimiento y auto-restart
      return () => {
        autoRestartRef.current = false
        try { reconocimientoRef.current?.stop() } catch {}
      }
    }, [])

    const handleChange = useCallback((e: any) => {
      const { name, value } = e.target
      setForm((prev: any) => ({ ...prev, [name]: value }))
    }, [])

    const handleSubmit = async (e: any) => {
      e.preventDefault()

      const camposObligatorios = camposFinal.filter(
        c => c.name !== "observacion" && campoActivo(c.name)
      )
      const formularioCompleto = camposObligatorios.every(campo => !!form[campo.name])
      const hayGrabacion = !!transcripcionVoz.trim()
      const hayRespuestasFormulario = Object.values(form).some(v => v && v !== "")

      // 🔍 Reglas de envío
      if (!((formularioCompleto && !hayGrabacion) || (hayGrabacion && !hayRespuestasFormulario))) {
        alert("Debes completar únicamente el formulario o únicamente la grabación por voz.")
        return
      }

      setEstado('enviando')

      // 📦 Armado de payload según tipo de respuesta
      const payload: any = { paciente_id: id };

      if (formularioCompleto && !hayGrabacion) {
        payload.campos_personalizados = { ...form };
      } else if (hayGrabacion && !hayRespuestasFormulario) {
        payload.campos_personalizados = { transcripcion: transcripcionVoz };
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

              <div className="flex flex-wrap gap-3">
                {!grabando ? (
                  <button
                    type="button"
                    onClick={() => iniciarGrabacion()}
                    disabled={grabando}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    🎤 Iniciar grabación
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={detenerGrabacion}
                    disabled={!grabando}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    ⏹ Detener grabación
                  </button>
                )}

                <button
                  type="button"
                  onClick={volverAGrabar}
                  disabled={grabando}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  🔁 Volver a grabar
                </button>

                <button
                  type="button"
                  onClick={borrarGrabacion}
                  disabled={grabando || !transcripcionVoz}
                  className="bg-gray-200 hover:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                >
                  🗑️ Borrar grabación
                </button>
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
