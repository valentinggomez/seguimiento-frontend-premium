"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useClinica } from '@/lib/ClinicaProvider'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { fetchConToken } from '@/lib/fetchConToken' // ⬅️ NUEVO

function FieldBlock({
  label,
  name,
  type = 'text',
  isSelect = false,
  isTextarea = false,
  inputMode,
  value,
  onChange,
  options,
}: {
  label: string
  name: string
  type?: string
  isSelect?: boolean
  isTextarea?: boolean
  inputMode?: 'numeric' | 'text'
  value: any
  onChange: (e: React.ChangeEvent<any>) => void
  options?: string[]           // 👈 nuevo
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
          {(options?.length ? options : ['Sí','No']).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
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
  const search = useSearchParams()
  // 👇 leer slug del form (?f=24h o ?slug=24h). Si no viene, 'default'
  const formSlug = (search.get('f') || search.get('slug') || '').trim() || 'default'

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

  const [puedeEnviar, setPuedeEnviar] = useState<boolean>(true)
  const [retryAt, setRetryAt] = useState<string | null>(null)
  const [cooldownHoras, setCooldownHoras] = useState<number | null>(null)
  const [checkingCooldown, setCheckingCooldown] = useState<boolean>(true)
  const [countdown, setCountdown] = useState<number | null>(null) // seg restantes
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [retryHuman, setRetryHuman] = useState<string | null>(null)
  const [formulario, setFormulario] = useState<any>(null)

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

  // Si el formulario tiene preguntas definidas, usalas; si no, caé a los campos base.
  type CampoCfg = { name: string; label?: string; type?: string; options?: string[] }

  const camposFromForm: CampoCfg[] =
    formulario?.campos?.preguntas && Array.isArray(formulario.campos.preguntas)
      ? formulario.campos.preguntas
      : []

  const camposFinal = (camposFromForm.length ? camposFromForm : camposBase).map((c: any) => ({
    name: c.name,
    label: c.label || c.name,
    type: c.type || 'text',
    numeric: c.type === 'number',
    options: Array.isArray(c.options) ? c.options : undefined,
  }))

  // por defecto todos activos (si luego querés flags a nivel campo, se agrega aquí)
  const campoActivo = (_nombre: string) => true

  const iniciarGrabacion = async () => {
    if (typeof MediaRecorder === 'undefined') {
      alert('Tu navegador no soporta grabación de audio.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      let mime = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm')) mime = 'audio/webm'
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mime = 'audio/mp4'
      else if (MediaRecorder.isTypeSupported('audio/ogg')) mime = 'audio/ogg'
      const mr = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorderRef.current = mr
      chunksRef.current = []
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      setAudioBlob(null)
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
          const total = chunksRef.current.reduce((a, b: any) => a + (b.size || 0), 0)
          if (total > 10 * 1024 * 1024) { try { mr.stop() } catch {} ; alert('La grabación superó el límite de 10 MB.') }
        }
      }
      mr.onstart = () => {
        setGrabando(true)
        setDuracion(0)
        if (timerRef.current) window.clearInterval(timerRef.current)
        timerRef.current = window.setInterval(() => {
          setDuracion((d) => { if (d >= 120) { try { mr.stop() } catch {} } ; return d + 1 })
        }, 1000) as unknown as number
      }
      mr.onstop = () => {
        setGrabando(false)
        if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
        const blob = new Blob(chunksRef.current, { type: mime })
        setAudioBlob(blob)
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(URL.createObjectURL(blob))
        try { stream.getTracks().forEach(t => t.stop()) } catch {}
      }
      mr.start()
    } catch (error) {
      console.error('Error al iniciar grabación:', error)
      alert('No se pudo acceder al micrófono.')
    }
  }

  const detenerGrabacion = () => { try { mediaRecorderRef.current?.stop() } catch {} }
  const volverAGrabar = async () => {
    try { mediaRecorderRef.current?.stop() } catch {}
    try { mediaRecorderRef.current?.stream?.getTracks()?.forEach((t:any) => t.stop()) } catch {}
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null); setAudioBlob(null); setDuracion(0)
    setTimeout(() => { iniciarGrabacion() }, 120)
  }
  const borrarGrabacion = () => {
    try { mediaRecorderRef.current?.stop() } catch {}
    setAudioBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null); setDuracion(0)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      try { mediaRecorderRef.current?.stream?.getTracks()?.forEach((t:any)=>t.stop()) } catch {}
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // --- nuevo: traer el formulario por slug dentro de la clínica ---
  useEffect(() => {
    const loadFormulario = async () => {
      if (!clinica?.id) return
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/formularios?clinica_id=${encodeURIComponent(clinica.id)}`
        const res = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store' })
        const raw = await res.json().catch(() => [])
        const arr = Array.isArray(raw) ? raw : (raw?.data || [])
        const found = arr.find((f: any) => String(f.slug).toLowerCase() === String(formSlug).toLowerCase())
        setFormulario(found || null)
      } catch {
        setFormulario(null)
      }
    }
    loadFormulario()
  }, [clinica?.id, formSlug])

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes/${id}`, { headers: getAuthHeaders() })
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

  // ⬇️ Cooldown POR FORMULARIO (incluye form_slug)
  const fetchPuedeEnviar = useCallback(async () => {
    try {
      setCheckingCooldown(true)
      const qs = new URLSearchParams({ paciente_id: String(id), form_slug: formSlug })
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/responder-voz/puede-enviar?${qs.toString()}`,
        { headers: getAuthHeaders() }
      )
      const data = await res.json()
      setPuedeEnviar(Boolean(data?.puedeEnviar))
      setRetryAt(data?.retryAt || null)
      setCooldownHoras(data?.horas ?? null)
      setSecondsLeft(data?.secondsLeft ?? null)
      setRetryHuman(data?.retryHuman ?? null)
    } catch {
      setPuedeEnviar(true)
      setRetryAt(null)
    } finally {
      setCheckingCooldown(false)
    }
  }, [id, formSlug])

  useEffect(() => { fetchPuedeEnviar() }, [fetchPuedeEnviar])

  useEffect(() => {
    if (secondsLeft != null) {
      setCountdown(secondsLeft)
      const t = setInterval(() => { setCountdown((s) => (s == null ? null : Math.max(0, s - 1))) }, 1000)
      return () => clearInterval(t)
    }
    if (retryAt) {
      const tick = () => {
        const diff = Math.max(0, Math.floor((new Date(retryAt).getTime() - Date.now()) / 1000))
        setCountdown(diff)
      }
      tick()
      const t = setInterval(tick, 1000)
      return () => clearInterval(t)
    }
    setCountdown(null)
  }, [secondsLeft, retryAt])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!puedeEnviar) { alert('Todavía no podés enviar otra respuesta. Probá más tarde.'); return }

    const camposObligatorios = camposFinal.filter(c => c.name !== "observacion" && campoActivo(c.name))
    const formularioCompleto = camposObligatorios.every(campo => !!form[campo.name])
    const hayAudio = !!audioBlob
    const hayRespuestasFormulario = Object.values(form).some(v => v && v !== "")

    if (grabando) { alert('Primero detené la grabación.'); return }

    // o formulario completo SIN audio, o SOLO audio SIN formulario
    if (!((formularioCompleto && !hayAudio) || (hayAudio && !hayRespuestasFormulario))) {
      alert("Completá únicamente el formulario o únicamente la grabación por voz.")
      return
    }

    setEstado('enviando')

    try {
      if (formularioCompleto && !hayAudio) {
        // --- SOLO FORMULARIO ---
        const payload = {
          paciente_id: id,
          form_slug: formSlug,
          respuestas: form,
          metadatos: {
            canal: 'web',
            ua: navigator.userAgent,
            enviado_en: new Date().toISOString(),
          },
        }
        const res = await fetchConToken('/api/respuestas', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        if (res.status === 409) {
          const data = await res.json().catch(() => ({}))
          setPuedeEnviar(false)
          setRetryAt(data?.retryAt || null)
          setSecondsLeft(data?.secondsLeft ?? null)
          setRetryHuman(data?.retryHuman ?? null)
          setEstado('ok')
          alert(data?.error || 'Esperá antes de volver a enviar.')
          return
        }
        if (!res.ok) throw new Error('Error al guardar formulario')
      } else if (hayAudio && !hayRespuestasFormulario) {
        // --- SOLO AUDIO ---
        const fd = new FormData()
        fd.append('paciente_id', String(id))
        fd.append('form_slug', formSlug)
        const ext = audioBlob?.type.includes('mp4') ? 'm4a'
                  : audioBlob?.type.includes('ogg') ? 'ogg'
                  : 'webm'
        fd.append('audio', audioBlob!, `respuesta.${ext}`)

        // armamos headers desde getAuthHeaders, pero sin Content-Type
        const headersMultipart = { ...getAuthHeaders() }
        delete (headersMultipart as any)['Content-Type']

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/responder-voz/audio`, {
          method: 'POST',
          headers: headersMultipart,
          body: fd,
        })
        if (res.status === 409) {
          const data = await res.json().catch(() => ({}))
          setPuedeEnviar(false)
          setRetryAt(data?.retryAt || null)
          setEstado('ok')
          alert(data?.error || 'Esperá antes de volver a enviar.')
          return
        }
        if (!res.ok) throw new Error('Error al guardar respuesta por voz')
      }

      setEstado('enviado')
      setForm({})
      setAudioBlob(null)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      setDuracion(0)
      fetchPuedeEnviar()
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

        <h1 className="text-3xl font-bold text-center text-[#003366]">
          Seguimiento postoperatorio <span className="text-sm text-gray-500">({formSlug})</span>
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">Completá cuidadosamente este control clínico.</p>

        {/* Aviso de cooldown */}
        {!checkingCooldown && !puedeEnviar && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 mb-2">
            <p className="font-semibold">Ya enviaste una respuesta recientemente.</p>
            <p className="text-sm">
              {retryHuman
                ? `Podrás volver a enviar alrededor de ${retryHuman}.`
                : countdown !== null
                  ? `Podrás volver a enviar en ${Math.floor(countdown/60)}m ${String(countdown%60).padStart(2,'0')}s.`
                  : retryAt
                    ? `Podrás volver a enviar después de ${new Date(retryAt).toLocaleString()}.`
                    : `Probá nuevamente más tarde${cooldownHoras ? ` (~${cooldownHoras}h)` : ''}.`}
            </p>
            {cooldownHoras && countdown !== null && (
              <div className="mt-2 h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${100 - Math.min(100, (countdown / (cooldownHoras*3600)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

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
                  options={campo.options}
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
            <button
              type="submit"
              disabled={estado==='enviando' || checkingCooldown || !puedeEnviar}
              className="bg-[#003366] hover:bg-[#002244] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all"
            >
              {estado === 'enviando' ? 'Enviando...' : 'Enviar respuesta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}