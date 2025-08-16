// components/GlobalSSEListener.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useSSE } from '@/hooks/useSSE'
import { useSonidoNotificacion } from '@/hooks/useSonidoNotificacion'
import { toast } from 'sonner'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useRouter } from 'next/navigation'

const now = () => Date.now()

// Firma única para dedupe (paciente|tel|msg recortado|fecha ó id)
const makeMsgId = (m: any) =>
  m?.id ||
  `${m?.paciente_id || ''}|${m?.telefono || ''}|${(m?.mensaje || '').slice(0, 120)}|${m?.fecha || ''}`

export default function GlobalSSEListener() {
  const { t } = useTranslation()
  const { reproducir, desbloquear } = useSonidoNotificacion({ cooldownMs: 2500 })
  const router = useRouter()

  const lastUserClickAtRef = useRef<number>(0)
  const lastSoundAtRef = useRef<number>(0)
  const seenToastIdsRef = useRef<Set<string>>(new Set())

  // 🔹 (1) Anti-doble montaje en dev/StrictMode
  const mountedRef = useRef(false) // <-- ADDED
  useEffect(() => {                // <-- ADDED
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Desbloqueo de audio en el primer gesto del usuario
  useEffect(() => {
    const onClick = () => {
      if (!lastUserClickAtRef.current) desbloquear()
      lastUserClickAtRef.current = now()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [desbloquear])

  useSSE((data: any) => {
    // ⛔️ Si el componente aún no está montado (doble render dev), salgo
    if (!mountedRef.current) return // <-- ADDED

    if (data?.tipo !== 'nuevo_mensaje') return

    const eid = makeMsgId(data)

    // 🔹 (3) Evitar que el Set crezca infinito
    if (seenToastIdsRef.current.size > 1000) {     // <-- ADDED
      seenToastIdsRef.current = new Set()          // <-- ADDED
    }                                              // <-- ADDED

    if (seenToastIdsRef.current.has(eid)) return
    seenToastIdsRef.current.add(eid)

    // Re-emitir eventos globales para que otras pantallas/comp sigan funcionando
    window.dispatchEvent(new CustomEvent('interaccion:nueva', { detail: data }))
    window.dispatchEvent(new CustomEvent('nuevo_mensaje', { detail: data }))

    // Notificación sonora (con cooldown y evitando clicks inmediatos)
    const justClicked = now() - lastUserClickAtRef.current < 400
    const cooldownOk = now() - lastSoundAtRef.current > 2500
    const visible = typeof document !== 'undefined' ? !document.hidden : true
    if (!justClicked && cooldownOk && visible) {
      reproducir()
      lastSoundAtRef.current = now()
    }

    // 🔹 (2) Elipsis solo si hace falta
    const previewRaw = String(data?.mensaje || '') // <-- ADDED
    const preview =                                // <-- ADDED
      previewRaw.length > 80 ? `${previewRaw.slice(0, 80)}…` : previewRaw

    // Toast "bonito" y accionable
    toast.custom((id) => (
      <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 shadow-lg rounded-2xl border border-slate-200 dark:border-slate-700 w-[340px]">
        <div className="mt-0.5">
          <MessageCircle className="w-6 h-6 text-blue-600" />
        </div>

        <div className="flex-1">
          <p className="font-semibold text-slate-900 dark:text-slate-50">
            {t?.('notificaciones.nuevo_mensaje') || 'Nuevo mensaje'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            <strong>{data?.nombre || t?.('paciente.desconocido') || 'Paciente'}</strong>:{' '}
            {preview /* <-- reemplaza al slice fijo */}
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                router.push('/panel/interacciones')
                toast.dismiss(id)
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-full transition"
            >
              {t?.('acciones.abrir') || 'Abrir'}
            </button>
            <button
              onClick={() => toast.dismiss(id)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-full transition"
            >
              {t?.('acciones.cerrar') || 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    ))
  }, {
    url: () => `${process.env.NEXT_PUBLIC_API_URL}/api/sse`,
    params: {
      token: (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '',
      host:  (typeof window !== 'undefined' ? window.location.hostname : '') || '',
    },
    reconnect: true,
    backoffMs: 1000,
    backoffMaxMs: 10000,
    pauseWhenHidden: false,          // global: mantener conexión aunque la pestaña esté oculta
    namedEvents: ['nuevo_mensaje'],
    onOpen: () => console.log('🌐 Global SSE abierta'),
    onError: (e) => console.warn('🌐 Global SSE error', e),
  })

  return null
}