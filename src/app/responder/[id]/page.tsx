  "use client"

  import { useEffect, useState, useCallback } from 'react'
  import { useParams } from 'next/navigation'
  import { motion } from 'framer-motion'
  import { useClinica } from '@/lib/ClinicaProvider'
  import { getAuthHeaders } from '@/lib/getAuthHeaders'
  import { useRef } from 'react'


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

    // 🎙 estados de audio
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [duracion, setDuracion] = useState<number>(0)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<BlobPart[]>([])
    const timerRef = useRef<number | null>(null)

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

    const iniciarGrabacion = async () => {
      if (typeof MediaRecorder === 'undefined') {
        alert('Tu navegador no soporta grabación de audio.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // Elegir el mejor MIME soportado
        let mime = 'audio/webm'
        if (MediaRecorder.isTypeSupported('audio/webm')) mime = 'audio/webm'
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mime = 'audio/mp4'
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mime = 'audio/ogg'

        const mr = new MediaRecorder(stream, { mimeType: mime })
        mediaRecorderRef.current = mr
        chunksRef.current = []

        // limpiar prev
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
        setAudioBlob(null)

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data)
            const total = chunksRef.current.reduce((a, b: any) => a + (b.size || 0), 0)
            if (total > 10 * 1024 * 1024) { // 10 MB
              try { mr.stop() } catch {}
              alert('La grabación superó el límite de 10 MB.')
            }
          }
        }

        mr.onstart = () => {
          setGrabando(true)
          setDuracion(0)
          if (timerRef.current) window.clearInterval(timerRef.current)
          timerRef.current = window.setInterval(() => {
            setDuracion((d) => {
              if (d >= 120) { // 2 minutos
                try { mr.stop() } catch {}
              }
              return d + 1
            })
          }, 1000) as unknown as number
        }

        mr.onstop = () => {
          setGrabando(false)
          if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
          const blob = new Blob(chunksRef.current, { type: mime })
          setAudioBlob(blob)
          if (audioUrl) URL.revokeObjectURL(audioUrl)
          setAudioUrl(URL.createObjectURL(blob))
          // cortar el mic
          try { stream.getTracks().forEach(t => t.stop()) } catch {}
        }

        mr.start()
      } catch (error) {
        console.error('Error al iniciar grabación:', error)
        alert('No se pudo acceder al micrófono.')
      }
    }

    const detenerGrabacion = () => {
      try { mediaRecorderRef.current?.stop() } catch {}
    }

    const volverAGrabar = async () => {
      // si está grabando, frená
      try { mediaRecorderRef.current?.stop() } catch {}

      // cortá cualquier stream abierto
      try { mediaRecorderRef.current?.stream?.getTracks()?.forEach((t:any) => t.stop()) } catch {}

      // limpiá el estado anterior
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      setAudioBlob(null)
      setDuracion(0)

      // pequeño delay para que termine el onstop y arrancar limpio
      setTimeout(() => { iniciarGrabacion() }, 120)
    }

    const borrarGrabacion = () => {
      try { mediaRecorderRef.current?.stop() } catch {}
      setAudioBlob(null)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      setDuracion(0)
    }

    useEffect(() => {
      return () => {
        // cleanup al desmontar
        if (timerRef.current) window.clearInterval(timerRef.current)
        try { mediaRecorderRef.current?.stream?.getTracks()?.forEach((t:any)=>t.stop()) } catch {}
        if (audioUrl) URL.revokeObjectURL(audioUrl)
      }
    }, [audioUrl])

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

      const camposObligatorios = camposFinal.filter(
        c => c.name !== "observacion" && campoActivo(c.name)
      )
      const formularioCompleto = camposObligatorios.every(campo => !!form[campo.name])
      const hayAudio = !!audioBlob
      const hayRespuestasFormulario = Object.values(form).some(v => v && v !== "")

      if (grabando) {
        alert('Primero detené la grabación.')
        return
      }

      // reglas: o formulario completo SIN audio, o SOLO audio SIN formulario
      if (!((formularioCompleto && !hayAudio) || (hayAudio && !hayRespuestasFormulario))) {
        alert("Completá únicamente el formulario o únicamente la grabación por voz.")
        return
      }

      setEstado('enviando')

      try {
        if (formularioCompleto && !hayAudio) {
          // --- SOLO FORMULARIO ---
          const payload = { paciente_id: id, campos_personalizados: { ...form } }
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/respuestas`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-clinica-host': window.location.hostname,
            },
            body: JSON.stringify(payload),
          })
          if (!res.ok) throw new Error('Error al guardar formulario')
        } else if (hayAudio && !hayRespuestasFormulario) {
          // --- SOLO AUDIO -> /responder-voz/audio ---
          const fd = new FormData()
          fd.append('paciente_id', String(id))

          // Elegir extensión acorde al tipo grabado
          const ext = audioBlob?.type.includes('mp4') ? 'm4a'
                  : audioBlob?.type.includes('ogg') ? 'ogg'
                  : 'webm'

          fd.append('audio', audioBlob!, `respuesta.${ext}`)

          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/responder-voz/audio`, {
            method: 'POST',
            headers: { 'x-clinica-host': window.location.hostname },
            body: fd,
          })
          if (!res.ok) throw new Error('Error al guardar respuesta por voz')
        }

        setEstado('enviado')
        setForm({})
        setAudioBlob(null)
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
        setDuracion(0)
        // Si querés volver a estado "ok" después de 3s:
        setTimeout(() => setEstado('ok'), 3000)
      } catch (err) {
        console.warn(err)
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
            
            {/* 🎤 Grabación por voz (audio real -> Whisper) */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="font-semibold text-blue-800">🎙 Responder por voz</p>

              <div className="flex items-center gap-3">
                {!grabando ? (
                  <button
                    type="button"
                    onClick={iniciarGrabacion}
                    disabled={grabando}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    🎤 Iniciar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={detenerGrabacion}
                    disabled={!grabando}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    ⏹ Detener
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
                  disabled={grabando || !audioBlob}
                  className="bg-gray-200 hover:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                >
                  🗑️ Borrar
                </button>

                {grabando && <span className="text-sm text-blue-800">Grabando… {duracion}s</span>}
              </div>

              {audioUrl && (
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                  <p className="text-sm text-gray-600">Previsualización:</p>
                  <audio src={audioUrl} controls />
                  <p className="text-xs text-gray-500">Duración: ~{duracion}s</p>
                </div>
              )}

              <p className="text-xs text-blue-700">
                Tip: podés elegir completar el formulario <strong>o</strong> enviar una grabación.  
                La IA transcribe y mejora la puntuación automáticamente.
              </p>
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
