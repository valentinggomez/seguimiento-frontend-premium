'use client'

import { useEffect, useRef, useCallback } from 'react'

type Options = {
  src?: string
  volume?: number         // 0..1
  cooldownMs?: number     // anti-ráfaga
}

export function useSonidoNotificacion(opts: Options = {}) {
  const { src = '/sounds/notificacion.wav', volume = 1, cooldownMs = 2000 } = opts

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastPlayAtRef = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.volume = Math.max(0, Math.min(1, volume))
    // asegura que se pueda reiniciar rápido
    audio.addEventListener('ended', () => {
      try { audio.currentTime = 0 } catch {}
    })
    audioRef.current = audio
    return () => {
      try {
        audio.pause()
        // @ts-ignore
        audio.src = ''
      } catch {}
      audioRef.current = null
    }
  }, [src, volume])

  const reproducir = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    // no sonar si la pestaña no está visible
    if (typeof document !== 'undefined' && document.hidden) return

    // cooldown anti-ráfaga
    const now = Date.now()
    if (now - lastPlayAtRef.current < cooldownMs) return

    try {
      if (!Number.isNaN(audio.duration)) {
        audio.currentTime = 0
      }
      const p = audio.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {}) // silenciar errores de autoplay
      }
      lastPlayAtRef.current = now
    } catch (err) {
      // no-op
    }
  }, [cooldownMs])

  // Desbloquea el audio en el primer gesto del usuario sin hacer ruido
  const desbloquear = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    try {
      // Intenta reproducir y corta inmediatamente
      const p = audio.play()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          try {
            if (!Number.isNaN(audio.duration)) {
              audio.pause()
              audio.currentTime = 0
            }
          } catch {}
        }).catch(() => {})
      }
    } catch {}
  }, [])

  return { reproducir, desbloquear }
}