// components/GlobalSSEListener.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useSSE } from '@/hooks/useSSE'
import { useSonidoNotificacion } from '@/hooks/useSonidoNotificacion'
import { toast } from 'sonner'

const now = () => Date.now()

export default function GlobalSSEListener() {
  const { reproducir, desbloquear } = useSonidoNotificacion({ cooldownMs: 2500 })
  const lastUserClickAtRef = useRef<number>(0)
  const lastSoundAtRef = useRef<number>(0)

  // Desbloqueo de audio una sola vez (primer gesto)
  useEffect(() => {
    const onClick = () => {
      if (!lastUserClickAtRef.current) desbloquear()
      lastUserClickAtRef.current = now()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [desbloquear])

  useSSE((data: any) => {
    if (data?.tipo !== 'nuevo_mensaje') return

    // Re-emitir un evento global para que páginas interesadas actualicen su UI
    window.dispatchEvent(new CustomEvent('interaccion:nueva', { detail: data }))

    // Notificación global (sonido + toast) en cualquier pantalla
    const justClicked = now() - lastUserClickAtRef.current < 400
    const cooldownOk = now() - lastSoundAtRef.current > 2500
    const visible = typeof document !== 'undefined' ? !document.hidden : true

    if (!justClicked && cooldownOk && visible) {
      reproducir()
      lastSoundAtRef.current = now()
    }

    toast.message('Nuevo mensaje', {
      description: `${data?.nombre || 'Paciente'}: ${(data?.mensaje || '').slice(0, 80)}…`,
      action: {
        label: 'Abrir',
        onClick: () => { window.location.href = '/interacciones' },
      },
    })
  }, {
    url: () => `${process.env.NEXT_PUBLIC_API_URL}/api/sse`,
    params: {
      token: (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '',
      host: (typeof window !== 'undefined' ? window.location.hostname : '') || '',
    },
    reconnect: true,
    backoffMs: 1000,
    backoffMaxMs: 10000,
    pauseWhenHidden: false,        // <-- global: seguí conectado aunque la pestaña esté oculta
    namedEvents: ['nuevo_mensaje'],
    onOpen: () => console.log('🌐 Global SSE abierta'),
    onError: (e) => console.warn('🌐 Global SSE error', e),
  })

  return null
}