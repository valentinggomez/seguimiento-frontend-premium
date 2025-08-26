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

function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open])

  if (!open) return null
  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="policy-modal-title"
      tabIndex={-1}
      ref={ref}
      className="fixed inset-0 z-[80] grid place-items-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 id="policy-modal-title" className="font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100" aria-label="Cerrar">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">{children}</div>
        <div className="px-5 py-3 border-t text-right">
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800">
            Entendido
          </button>
        </div>
      </div>
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
  // 🇵🇱 Políticas (por clínica/form)
  const [politicas, setPoliticas] = useState<{
    require_aceptacion: boolean
    politicas_version: string
    politicas_url: string
    politicas_html: string
  } | null>(null)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [politicasLoading, setPoliticasLoading] = useState(false)
  const [politicasError, setPoliticasError] = useState<string | null>(null)
  const [showPoliticas, setShowPoliticas] = useState(false)
  
  // 👈 pegalo arriba del archivo, cerca de los otros types
  type CampoUI = {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    numeric: boolean;
    options?: string[];
  };

  const camposBase: CampoUI[] = [
    { name: "telefono", label: "Teléfono de contacto", type: "text",  numeric: false },
    { name: "nombre_medico", label: "Nombre del médico", type: "text", numeric: false },
    { name: "dolor_6h", label: "🤕 Nivel de dolor a las 6h", type: "number", numeric: true },
    { name: "dolor_24h", label: "🔥 Nivel de dolor a las 24h", type: "number", numeric: true },
    { name: "dolor_mayor_7", label: "📈 ¿Dolor mayor a 7?", type: "select", numeric: false, options: ["Sí","No"] },
    { name: "nausea", label: "🤢 ¿Tuviste náuseas?", type: "select", numeric: false, options: ["Sí","No"] },
    { name: "vomitos", label: "🤮 ¿Tuviste vómitos?", type: "select", numeric: false, options: ["Sí","No"] },
    { name: "somnolencia", label: "😴 ¿Tuviste somnolencia?", type: "select", numeric: false, options: ["Sí","No"] },
    { name: "requiere_mas_medicacion", label: "💊 ¿Requirió más medicación?", type: "select", numeric: false, options: ["Sí","No"] },
    { name: "desperto_por_dolor", label: "🌙 ¿Se despertó por dolor?", type: "select", numeric: false, options: ["Sí","No"] },
    { name: "satisfaccion", label: "🌟 Nivel de satisfacción (1 a 10)", type: "number", numeric: true },
    { name: "horas_movio_extremidades", label: "🏃 ¿Horas hasta mover extremidades?", type: "number", numeric: true },
    { name: "observacion", label: "📝 Observaciones (opcional)", type: "textarea", numeric: false },
  ];

  // —— Normalizador de preguntas: soporta {name,label,type,options} y {id,etiqueta,tipo,opciones}
  type CampoCfgIn =
    | { name?: string; label?: string; type?: string; options?: string[] | string | null }
    | { id?: string; etiqueta?: string; tipo?: string; opciones?: string[] | string | null }
    | any;

  // deja tu CampoCfgIn como lo tenés
  function normalizarCampo(c: CampoCfgIn): CampoUI {
    const name  = String(c?.name ?? c?.id ?? '').trim();
    const label = String(c?.label ?? c?.etiqueta ?? name).trim();
    const raw   = String(c?.type ?? c?.tipo ?? 'text').trim().toLowerCase();

    const type: CampoUI['type'] =
      ['text','number','select','textarea'].includes(raw as any)
        ? (raw as CampoUI['type'])
        : raw.includes('area') ? 'textarea'
        : raw.includes('select') ? 'select'
        : raw.includes('num') ? 'number'
        : 'text';

    // ---- options robusto ----
    let options: string[] | undefined;
    const o = (c as any)?.options ?? (c as any)?.opciones;
    if (Array.isArray(o)) options = o.map(String);
    else if (typeof o === 'string') options = o.split(/[,|]/).map(s => s.trim()).filter(Boolean);

    return { name, label, type, numeric: type === 'number', options };
  }

  // tolerar que "campos" venga como string JSON
  let camposObj = (formulario as any)?.campos;
  if (typeof camposObj === 'string') {
    try { camposObj = JSON.parse(camposObj) } catch { camposObj = undefined }
  }

  const preguntasFrom: CampoCfgIn[] =
    Array.isArray(camposObj?.preguntas)         ? camposObj.preguntas :
    Array.isArray((formulario as any)?.preguntas) ? (formulario as any).preguntas :
    [];

  const camposFromForm: CampoUI[] = preguntasFrom.map(normalizarCampo);

  const camposFinal: CampoUI[] = (camposFromForm.length ? camposFromForm : camposBase);

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
      try {
        setPoliticasLoading(true);
        setPoliticasError(null);

        const host =
          typeof window !== 'undefined'
            ? window.location.hostname.split(':')[0].toLowerCase().trim()
            : '';

        // 1) endpoint público por slug (filtrado por host en backend)
        let res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/formularios/slug/${encodeURIComponent(formSlug)}`,
          { headers: { 'x-clinica-host': host }, cache: 'no-store' }
        );

        // 2) fallback: listado por clinica_id (si hay token y clinica.id)
        if (!res.ok && clinica?.id) {
          res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/formularios?clinica_id=${encodeURIComponent(clinica.id)}`,
            { headers: { ...getAuthHeaders(), 'x-clinica-host': host }, cache: 'no-store' }
          );
        }

        const json = await res.json().catch(() => ({}));
        const arr  = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        const found = arr.length
          ? arr.find((f: any) => String(f.slug).toLowerCase() === String(formSlug).toLowerCase())
          : (json && !Array.isArray(json) ? json : null);

        setFormulario(found || null);

        // ====== Políticas (igual que antes, con fallback a /politicas) ======
        try {
          const meta = (found?.meta || {}) as any;
          const politicasForm = meta?.politicas || meta;

          const origin =
            (typeof window !== 'undefined' && window.location?.origin)
              ? window.location.origin
              : (process.env.NEXT_PUBLIC_FRONT_ORIGIN || '');

          const fallbackPoliticasUrl =
            (clinica?.id && origin)
              ? `${origin}/politicas?clinica_id=${encodeURIComponent(clinica.id)}`
              : '';

          const p = {
            require_aceptacion: Boolean(
              politicasForm?.require_aceptacion ??
              clinica?.require_aceptacion ??
              true
            ),
            politicas_version: String(
              politicasForm?.terminos_version ??
              politicasForm?.politicas_version ??
              clinica?.politicas_version ??
              ''
            ),
            politicas_url: String(
              politicasForm?.terminos_url ??
              politicasForm?.politicas_url ??
              clinica?.politicas_url ??
              ((politicasForm?.terminos_html || politicasForm?.politicas_html || clinica?.politicas_html) ? '' : fallbackPoliticasUrl)
            ),
            politicas_html: String(
              politicasForm?.terminos_html ??
              politicasForm?.politicas_html ??
              clinica?.politicas_html ??
              ''
            ),
          };
          setPoliticas(p);
          setAceptaTerminos(false);
        } catch {
          setPoliticas({
            require_aceptacion: true,
            politicas_version: '',
            politicas_url: '',
            politicas_html: ''
          });
        }
      } catch {
        setFormulario(null);
        setPoliticasError('No se pudieron cargar las políticas');
      } finally {
        setPoliticasLoading(false);
      }
    };

    if (formSlug) loadFormulario();
  }, [clinica?.id, formSlug]);

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

  // ⬇️ Cooldown POR FORMULARIO (incluye form_slug / formulario_id)
  const fetchPuedeEnviar = useCallback(async () => {
    try {
      setCheckingCooldown(true)

      const qs = new URLSearchParams({
        paciente_id: String(id),
      })
      // Prioridad: si tenemos id del form, lo mandamos; si no, mandamos slug
      if (formulario?.id) {
        qs.set('formulario_id', String(formulario.id))
      } else if (formSlug) {
        qs.set('form_slug', String(formSlug))
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/respuestas/puede-enviar?${qs.toString()}`,
        { headers: getAuthHeaders() }
      )
      const data = await res.json()

      setPuedeEnviar(Boolean(data?.puedeEnviar))
      setRetryAt(data?.retryAt || null)
      setCooldownHoras(data?.horas ?? null)
      setSecondsLeft(data?.secondsLeft ?? null)
      setRetryHuman(data?.retryHuman ?? null)
    } catch {
      // si falla, no bloquees al usuario
      setPuedeEnviar(true)
      setRetryAt(null)
      setSecondsLeft(null)
      setRetryHuman(null)
    } finally {
      setCheckingCooldown(false)
    }
  }, [id, formSlug, formulario?.id])

  // recalcular cuando cambie el paciente, el slug o se resuelva el formulario
  useEffect(() => {
    // reset visual al cambiar de formulario
    setPuedeEnviar(true)
    setRetryAt(null)
    setSecondsLeft(null)
    setRetryHuman(null)
    setCountdown(null)

    fetchPuedeEnviar()
  }, [fetchPuedeEnviar])

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

  useEffect(() => {
    if (politicas && !politicas.require_aceptacion) {
      setAceptaTerminos(true)
    }
  }, [politicas])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (politicas?.require_aceptacion && !aceptaTerminos) {
      alert('Debés aceptar las políticas de privacidad y condiciones de uso para continuar.')
      return
    }
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
          formulario_id: formulario?.id ?? null, 
          respuestas: form,
          metadatos: {
            canal: 'web',
            ua: navigator.userAgent,
            enviado_en: new Date().toISOString(),
          },
          _terminos_aceptados: politicas?.require_aceptacion ? !!aceptaTerminos : null,
          _terminos_aceptados_en: new Date().toISOString(),
          _terminos_version: politicas?.politicas_version || null,
          _politicas_url: politicas?.politicas_url || null,
          _politicas_fingerprint: [
            politicas?.politicas_version || '',
            politicas?.politicas_url || '',
            (politicas?.politicas_html || '').slice(0, 120)
          ].filter(Boolean).join('|') || null,
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
        if (formulario?.id) fd.append('formulario_id', String(formulario.id))
        const ext = audioBlob?.type.includes('mp4') ? 'm4a'
                  : audioBlob?.type.includes('ogg') ? 'ogg'
                  : 'webm'
        fd.append('audio', audioBlob!, `respuesta.${ext}`)
        // 👇 trazabilidad de aceptación también en audio
        fd.append('_terminos_aceptados', String(politicas?.require_aceptacion ? !!aceptaTerminos : ''));
        fd.append('_terminos_aceptados_en', new Date().toISOString());
        if (politicas?.politicas_version) fd.append('_terminos_version', politicas.politicas_version);
        if (politicas?.politicas_url)     fd.append('_politicas_url', politicas.politicas_url);
        fd.append('_politicas_fingerprint', [
          politicas?.politicas_version || '',
          politicas?.politicas_url || '',
          (politicas?.politicas_html || '').slice(0, 120)
        ].filter(Boolean).join('|') || '');

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
        
        {politicasError && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
            {politicasError}. Se requerirá aceptación igualmente.
          </div>
        )}

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
                  options={Array.isArray(campo.options) ? campo.options : undefined}
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

          {/* 🔒 Políticas de privacidad / Términos (versión SUPREME) */}
          <div className="rounded-2xl border bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            {/* Header bonito */}
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔒</span>
                <div className="leading-tight">
                  <p className="font-semibold text-slate-800">Políticas de privacidad y condiciones de uso</p>
                  <p className="text-xs text-slate-500">Leé y aceptá para continuar con el envío</p>
                </div>
              </div>
              {politicas?.politicas_version ? (
                <span className="inline-flex items-center rounded-full bg-slate-800/90 px-3 py-1 text-xs font-medium text-white">
                  v{politicas.politicas_version.replace(/^v/i,'')}
                </span>
              ) : null}
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Link / Inline / Fallback */}
              {politicas?.politicas_url ? (
                <p className="text-sm text-slate-700">
                  Podés leer las políticas completas aquí:{' '}
                  <button
                    type="button"
                    onClick={() => setShowPoliticas(true)}
                    className="font-medium text-[#003466] underline underline-offset-2 hover:opacity-80"
                  >
                    Ver políticas
                  </button>
                  {politicas.politicas_version && (
                    <span className="ml-2 text-slate-500">(versión {politicas.politicas_version})</span>
                  )}
                </p>
              ) : politicas?.politicas_html ? (
                <div className="prose prose-sm max-w-none text-slate-700">
                  {/* Mostramos resumen corto y modal para lectura completa */}
                  <div dangerouslySetInnerHTML={{ __html: (politicas.politicas_html || '').slice(0, 280) + '…' }} />
                  <button
                    type="button"
                    onClick={() => setShowPoliticas(true)}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Leer completo
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-700">
                  Al continuar aceptás el tratamiento de tus datos con fines asistenciales y analíticos,
                  conforme a las políticas de privacidad de esta clínica.
                </p>
              )}

              {/* Checkbox custom */}
              <label className="group mt-1 flex gap-3 items-start">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 appearance-none rounded-md border-2 border-slate-300 checked:border-[#003366] checked:bg-[#003366] grid place-content-center"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  disabled={politicasLoading}
                />
                <span className="text-sm text-slate-800">
                  Declaro haber leído y aceptar las políticas de privacidad y condiciones de uso.
                </span>
              </label>

              {/* Microcopy / error */}
              {politicasLoading && <p className="text-xs text-slate-500">Cargando políticas…</p>}
              {politicasError && <p className="text-xs text-red-600">No se pudieron cargar. Se requerirá aceptación igualmente.</p>}
            </div>
          </div>

          {/* Modal de Políticas */}
          <Modal
            open={showPoliticas}
            onClose={() => setShowPoliticas(false)}
            title="Políticas de privacidad y condiciones de uso"
          >
            {politicas?.politicas_html ? (
              <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: politicas.politicas_html }} />
            ) : politicas?.politicas_url ? (
              <iframe
                src={politicas.politicas_url}
                className="w-full h-[60vh] border rounded-lg"
                title="Políticas"
              />
            ) : (
              <p className="text-sm text-slate-700">
                No hay contenido específico cargado. Consultá la página de políticas o contactá a la clínica.
              </p>
            )}
          </Modal>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                estado==='enviando' ||
                checkingCooldown ||
                !puedeEnviar ||
                (politicas?.require_aceptacion && !aceptaTerminos)
              }
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